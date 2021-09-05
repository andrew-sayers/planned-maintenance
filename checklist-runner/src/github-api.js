/*
 * Data
 */

let personal_access_token = sessionStorage.getItem('pat')||'';

let error_reporter = () => true;

let callbacks = [], callback_id = 0;

setInterval(
    () => {
        if ( callbacks.length ) {
            callbacks[callback_id%callbacks.length]();
            ++callback_id;
        } else {
            callback_id = 0;
        }
    },
    2000
);

/*
 * Functions to talk to GitHub
 *
 * I considered using octokit: https://github.com/octokit/octokit.js
 * but it doesn't seem to add much value and loads a lot of
 * dependencies (creating log noise in the console, which users will
 * be monitoring for errors).
 */

function github_send(url,init,onerror) {
    if ( !init.headers ) init.headers = {};
    init.headers['Content-Type'] = 'Accept: application/vnd.github.v3+json';
    if ( personal_access_token ) {
        init.headers.Authorization = 'token ' + personal_access_token;
    }
    return (
        fetch(`https://api.github.com${url}`,init)
            .then( response => {
                if ( !response.ok ) {
                    if (
                        onerror
                            ? onerror(response.statusText)
                            : error_reporter(`https://api.github.com${url}: ${response.statusText}`)
                    ) {
                        throw new Error("Request failed: " + response.statusText);
                    }
                }
                return response;
            })
            .catch(
                error => {
                    onerror
                        ? onerror(error)
                        : error_reporter(`https://api.github.com${url}: ${error}`)
                    ;
                    throw error;
                }
            )
    );
}
function github_get(url,cache,onerror) {
    return github_send(url,{cache: cache||'default'},onerror)
        .then( response => response.json() )
}
function github_delete(url) {
    return github_send(url,{method:"DELETE"});
}
function github_put(url,onerror) {
    return github_send(url,{method:"PUT",body: '{}'},onerror);
}
function github_post(url,body) {
    return github_send(url,{
        method:"POST",
        body: JSON.stringify(body),
    })
}

export default {

    /*
     * Utility functions
     */

    set_personal_access_token(token) {
        sessionStorage.setItem('pat',personal_access_token = token);
    },
    get_personal_access_token() {
        return personal_access_token;
    },
    has_personal_access_token() {
        return !!personal_access_token;
    },

    set_error_reporter(func) {
        error_reporter = func;
    },

    /*
     * API
     */

    prepare_steps(steps) {
        const get_urls = {},
              get_url  = (url,onerror) => {
                  if ( !get_urls[url] ) get_urls[url] = github_get(url,undefined,onerror);
                  return get_urls[url];
              };
        steps.forEach( step => {
            step.actions.forEach(
            action => {
                switch ( action.action ) {
                case "check_site":
                case "add_comment":
                case "create_branch":
                case "delete_branch":
                    break;
                case "accept_pr":
                    get_url(`/repos/${action.owner}/${action.repo}/pulls/${action.id}`)
                        .then( data => action.data = data )
                    break;
                case "run_workflow":
                case "wait_for_workflow":
                case "enable_workflow":
                case "disable_workflow":
                    get_url(`/repos/${action.owner}/${action.repo}/actions/workflows/${action.id}`)
                        .then( status => action.status = status );
                    get_url(`/repos/${action.owner}/${action.repo}/actions/workflows/${action.id}/runs`)
                        .then( data => action.data = (data.workflow_runs||[])[0] );
                    break;
                default:
                    error_reporter(`Invalid action type: ${JSON.stringify(action)}`);
                }
            }
        );
        });
    },

    run_step(step) {

        let success = true,
            promises = []
        ;

        step.actions.forEach( action => {
            switch ( action.action ) {

            case "accept_pr":
                promises.push(
                    github_put(
                        `/repos/${action.owner}/${action.repo}/pulls/${action.id}/merge`,
                        error => action.merge_result = error
                    )
                        .then( data => {
                            success &= data.ok;
                            action.merge_result = "merged"
                        })
                );
                break;

            case "run_workflow":
            case "wait_for_workflow": {
                const workflow_url = `/repos/${action.owner}/${action.repo}/actions/workflows/${action.id}/runs`;
                github_get( workflow_url, 'no-cache' )
                    .then( data => {
                        action.data = data.workflow_runs[0];
                        const runs = data.workflow_runs.length,
                              callback = () => github_get( workflow_url, 'no-cache' )
                              .then( data => {
                                  action.data = data.workflow_runs[0];
                                  if ( data.workflow_runs.length > runs && data.workflow_runs[0].status == "completed" ) {
                                      success &= data.workflow_runs[0].conclusion=='success';
                                      callbacks = callbacks.filter( cb => cb != callback );
                                  }
                              })
                              .catch( () => callbacks = callbacks.filter( cb => cb != callback ) )
                        ;
                        if ( action.action == "run_workflow" ) {
                            promises.push(
                                github_post(
                                    `/repos/${action.owner}/${action.repo}/actions/workflows/${action.id}/dispatches`,
                                    {"ref":action.ref||"main"}
                                )
                                    .then( () => callbacks.push(callback) )
                            );
                        } else {
                            callbacks.push(callback);
                        }
                    });
                break;
            }

            case "enable_workflow":
                promises.push(
                    github_put(
                        `/repos/${action.owner}/${action.repo}/actions/workflows/${action.id}/enable`
                    )
                        .then ( data => success &= data.ok )
                );
                break;

            case "disable_workflow":
                promises.push(
                    github_put(
                        `/repos/${action.owner}/${action.repo}/actions/workflows/${action.id}/disable`
                    )
                        .then ( data => success &= data.ok )
                );
                break;

            case "add_comment":
                promises.push(
                    github_post(
                        `/repos/${action.owner}/${action.repo}/issues/${action.id}/comments`,
                        {
                            body: action.body.replace( /{{(.*?)}}/g, (_,id) => {
                                for ( let n=0; n!=action.fields.length; ++n ) {
                                    const field = action.fields[n];
                                    if ( field.id == id ) {
                                        if ( field.type == "switch" ) {
                                            return field.value?field.on:field.off
                                        } else {
                                            return field.value;
                                        }
                                    }
                                }
                                return '`(undefined)`';
                            }),
                        }
                    )
                        .then ( data => success &= data.ok )
                );
                break;

            case "create_branch":
                promises.push(
                    github_get(
                        `/repos/${action.owner}/${action.repo}/git/ref/heads/${action.source}`
                    )
                        .then( data =>
                            github_post(
                                `/repos/${action.owner}/${action.repo}/git/refs`,
                                {
                                    ref: 'refs/heads/'+action.destination,
                                    sha: data.object.sha,
                                }
                            )
                                .then ( data => success &= data.ok )
                        )
                );
                break;

            case "delete_branch":
                promises.push(
                    github_delete(
                        `/repos/${action.owner}/${action.repo}/git/refs/heads/${action.name}`,
                    )
                        .then ( data => success &= data.ok )
                );
                break;
            }
        });

        return Promise.all(promises).then( () => success );

    },

};
