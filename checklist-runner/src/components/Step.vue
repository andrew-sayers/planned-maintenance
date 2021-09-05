<template>
    <div>
        <v-stepper-step
          :complete="complete"
          :step="step"
          editable
        >
            {{data.title}}
            <small>{{subtitle}}</small>
        </v-stepper-step>

        <v-stepper-content
          :step="step"
        >

            <template v-if="action_groups.setup">
                <h2>Create personal access token</h2>
                <p>Create a Personal Access Token so this page can run actions automatically.</p>
                <ol>
                    <li>
                        <a href="https://github.com/settings/tokens/new">Create a new token</a>
                        <ul>
                            <li>Set the <em>Note</em> to the URL of the maintenance issue</li>
                            <li>Set the <em>Expiration</em> to the shortest available time</li>
                            <li>Select the <em>repo</em> and <em>workflow</em> scopes</li>
                            <li>Click <em>Generate token</em> at the bottom of the page</li>
                        </ul>
                    </li>
                    <li>
                        <v-text-field
                          :append-icon="show_pat ? 'mdi-eye' : 'mdi-eye-off'"
                          :type="show_pat ? 'text' : 'password'"
                          label="Paste the token in here"
                          v-model="pat"
                          @click:append="show_pat = !show_pat"
                        >
                        </v-text-field>
                    </li>
                    <li><a href="#page" @click="reload($event)">Refresh this page</a></li>
                </ol>
                <h2>Browser setup</h2>
                <ol>
                    <li>Move this tab to a new window</li>
                    <li>Open any other tabs you will need in the same window</li>
                    <li>Open the console for this tab, to see any actions that fail</li>
                </ol>
                <template v-if="health_check.length">
                    <h2>Health check</h2>
                    <p>Make sure the following are all as expected:</p>
                    <v-simple-table>
                        <template v-slot:default>
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Status</th>
                                    <th>Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                  v-for="(action,n) in health_check"
                                  :key="n"
                                >
                                    <template v-if="action.action == 'accept_pr'">
                                        <th>Pull request</th>
                                        <td>
                                            <Label
                                              :started="action.data.id"
                                              :active="true"
                                              :completed="action.data.id"
                                              :success="action.data.mergeable"
                                              :message="action.data.state"
                                              :href="action.data.html_url"
                                            />
                                        </td>
                                        <td>
                                            <a v-if="action.data" :href="action.data.html_url">{{action.owner}}/{{action.repo}}: {{action.data.title}}</a>
                                            <template v-else>loading</template>
                                        </td>
                                    </template>
                                    <template v-else>
                                        <th>Workflow</th>
                                        <td>
                                            <Label
                                              :started="action.data.status"
                                              :active="action.status.state=='active'"
                                              :completed="action.data.status == 'completed'"
                                              :success="action.data.conclusion=='success'"
                                              :message="action.data.conclusion||action.data.status"
                                              :href="`https://github.com/${action.owner}/${action.repo}/actions/workflows/${action.id}`"
                                            />
                                        </td>
                                        <td>
                                            <a :href="`https://github.com/${action.owner}/${action.repo}/actions/workflows/${action.id}`">{{action.owner}}/{{action.repo}}: {{action.data.name||"loading..."}}</a>
                                        </td>
                                    </template>
                                </tr>
                            </tbody>
                        </template>
                    </v-simple-table>
                </template>
            </template>

            <template v-else-if="action_groups.teardown">

                <h2>Delete personal access token</h2>
                <p>This page&rsquo;s token should no longer be needed.</p>
                <ol>
                    <li><a href="https://github.com/settings/tokens">Go to your tokens page</a></li>
                    <li>Click <em>Delete</em> for the token with the URL of the maintenance issue</li>
                </ol>
            </template>

            <template v-else>

                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Status</th>
                                <th>Name</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                              v-for="(action,n) in data.actions"
                              :key="n"
                            >

                                <th style="text-transform:capitalize">{{action.action.replace(/_.*/,'')}}</th>

                                <template v-if="action.action == 'check_site'">
                                    <td>
                                        <v-switch
                                          v-model="action.checked"
                                          :label="action.checked?'checked':'waiting'"
                                        />
                                    </td>
                                    <td><a target="_blank" :href="action.url">{{action.title}}</a></td>
                                    <td>{{action.comment}}</td>
                                </template>

                                <template v-else-if="action.action == 'accept_pr'">
                                    <td>
                                        <Label
                                          :started="action.data.id"
                                          :active="true"
                                          :completed="action.data.id"
                                          :success="action.data.mergeable"
                                          :message="action.data.state"
                                          :href="action.data.html_url"
                                        />
                                    </td>
                                    <td>
                                        <a v-if="action.data" :href="action.data.html_url">{{action.owner}}/{{action.repo}}: {{(action.data||{title:action.id}).title}}</a>
                                        <template v-else>{{action.owner}}/{{action.repo}}: {{(action.data||{title:action.id}).title}}</template>
                                    </td>
                                    <td>
                                        <template v-if="action.data">Last updated {{time_ago(action.data.updated_at)}}</template>
                                        <template v-else>(loading)</template>
                                    </td>
                                </template>

                                <template v-else-if="action.action.search(/_workflow$/) != -1">
                                    <td>
                                        <Label
                                          :started="action.data.status"
                                          :active="action.status.state=='active'"
                                          :completed="action.data.status == 'completed'"
                                          :success="action.data.conclusion=='success'"
                                          :message="action.data.conclusion||action.data.status"
                                          :href="`https://github.com/${action.owner}/${action.repo}/actions/workflows/${action.id}`"
                                        />
                                    </td>
                                    <td>
                                        <a :href="`https://github.com/${action.owner}/${action.repo}/actions/workflows/${action.id}`">
                                            {{action.owner}}/{{action.repo}}: {{(action.data||{name:action.id}).name}}
                                        </a>
                                    </td>
                                    <td>
                                        <template v-if="action.data">Last run {{time_ago(action.data.updated_at)}}</template>
                                        <template v-else>(loading)</template>
                                    </td>
                                </template>

                                <template v-else-if="action.action=='create_branch'">
                                    <td>
                                        <Label
                                          :started="action.status"
                                          :active="true"
                                          :completed="action.status != 'loading'"
                                          :success="action.status==`doesn't exist`"
                                          :message="action.status"
                                          :href="`https://github.com/${action.owner}/${action.repo}/tree/${action.destination}`"
                                        />
                                    </td>
                                    <td>
                                        <a :href="`https://github.com/${action.owner}/${action.repo}/tree/${action.destination}`">
                                            {{action.owner}}/{{action.repo}}/{{action.destination}}
                                        </a>
                                        from
                                        <a :href="`https://github.com/${action.owner}/${action.repo}/tree/${action.source}`">
                                            {{action.source}}
                                        </a>
                                        
                                    </td>
                                    <td/>
                                </template>

                                <template v-else-if="action.action=='delete_branch'">
                                    <td>
                                        <Label
                                          :started="action.status"
                                          :active="true"
                                          :completed="action.status != 'loading'"
                                          :success="action.status==`exists`"
                                          :message="action.status"
                                          :href="`https://github.com/${action.owner}/${action.repo}/tree/${action.destination}`"
                                        />
                                    </td>
                                    <td>
                                        <a :href="`https://github.com/${action.owner}/${action.repo}/tree/${action.name}`">
                                            {{action.owner}}/{{action.repo}}/{{action.name}}
                                        </a>
                                    </td>
                                    <td/>
                                </template>

                                <template v-else-if="action.action == 'add_comment'">
                                    <td></td>
                                    <td>
                                        <a :href="`https://github.com/${action.owner}/${action.repo}/issues/${action.id}`">
                                            {{action.owner}}/{{action.repo}} #{{action.id}}
                                        </a>
                                    </td>
                                    <td/>
                                </template>

                                <template v-else>
                                    <td colspan="2">Error: unrecognised action "{{action.action}}"</td>
                                </template>

                            </tr>
                        </tbody>
                    </template>
                </v-simple-table>

                <v-form
                  v-for="(action,n) in data.actions.filter( action => action.action == 'add_comment' )"
                  :key="n"
                >
                    <div
                      v-for="(field,n) in action.fields"
                      :key="n"
                    >
                        <v-switch
                          v-if="field.type=='switch'"
                          v-model="field.value"
                          :label="`${field.label}: ${field.value?field.on:field.off}`"
                        />
                        <v-textarea
                          v-else-if="field.type=='textarea'"
                          v-model="field.value"
                          :label="field.label"
                        />
                        <template v-else>
                            <strong>ERROR: invalid field - fix this before running the workflow</strong><br>
                            {{field}}
                        </template>
                    </div>
                </v-form>

                <v-btn
                  v-if="btn_text"
                  style="margin-top:1em;float:right"
                  :disabled="this.running||this.disabled"
                  :class="btn_class"
                  @click="run_step()"
                  color="green"
                >
                    {{btn_text}}
                </v-btn>

            </template>

        </v-stepper-content>

    </div>
</template>

<script>
import Label from './Label';
import github_api from '../github-api.js';
export default {
  name: 'Step',

  props: ["step","steps","data","complete","disabled"],

  components: {
    Label,
  },

  methods: {

    reload() {
      location.reload();
    },

    time_ago(time) {
      return window.moment(time).fromNow();
    },

    message(action_groups) {

      return Object
        .keys(action_groups)
        .filter( key => key != 'workflows' && key != 'branches' )
        .map( action => {
          const count = action_groups[action].length;
          if ( count == 1 ) {
            switch ( action ) {
              case 'setup': return 'prepare your environment';
              case 'teardown': return 'Undo setup actions';
              case 'check_site': return `check a site`;
              case 'accept_pr': return `accept a pull request`;
              case 'run_workflow': return `run a workflow`;
              case 'wait_for_workflow': return `wait for a workflow`;
              case 'enable_workflow': return `enable a workflow`;
              case 'disable_workflow': return `disable a workflow`;
              case 'add_comment': return `create a comment`;
              case 'create_branch': return `create a branch`;
              case 'delete_branch': return `delete a branch`;
              default: return action;
            }
          } else {
            switch ( action ) {
              case 'check_site': return `check ${count} sites`;
              case 'accept_pr': return `accept ${count} pull requests`;
              case 'run_workflow': return `run ${count} workflows`;
              case 'wait_for_workflow': return `wait for ${count} workflows`;
              case 'enable_workflow': return `enable ${count} workflows`;
              case 'disable_workflow': return `disable ${count} workflows`;
              case 'add_comment': return `create ${count} comments`;
              case 'create_branch': return `create ${count} branches`;
              case 'delete_branch': return `delete ${count} branches`;
              default: return `${action} * ${count}`;
            }
          }
        })
        .join(", ")
      ;

    },

    run_step() {
      this.failed = false;
      this.running = true;
      let min_end_time = new Date().getTime() + 1000,
          finalise = success => setTimeout(
            () => {
              this.failed = !success;
              this.running = false;
            },
            Math.max( 0, min_end_time - new Date().getTime() )
          )

      ;
      github_api
        .run_step(this.data)
        .then( finalise )
        .catch( () => finalise(false) );
    },

  },

  computed: {

    btn_class() {
      return (
        (this.disabled?'':'white--text')
        +
        (this.failed?' shake':'')
      );
    },

    action_groups() {
      const ret = {};
      this.data.actions.forEach( action => {
        ( ret[action.action] = (ret[action.action]||[]) ).push(action);
        if ( action.action.search(/workflow/) != -1 ) {
          ( ret.workflows = (ret.workflows||[]) ).push(action);
        }
        if ( action.action.search(/branch/) != -1 ) {
          ( ret.branches = (ret.branches||[]) ).push(action);
        }
      });
      return ret;
    },

    subtitle() {
      return this.message(this.action_groups);
    },
    btn_text() {
      const groups = Object.assign( {}, this.action_groups );
      delete groups['check_site'];
      return this.message(groups);
    },

    health_check() {
      let ids = {}, ret = [];
      (this.steps||[]).forEach(
        step => ret = ret.concat(
          step.actions.filter(
            action => {
              const id = action.owner + ' ' + action.repo + ' ' + action.id;
              if ( ids[id] ) return false;
              ids[id] = 1;
              return action.action.search(/(^accept_pr|workflow)$/) != -1;
            }
          )
        )
      );
      return ret;
    },

  },

  data: () => ({
    show_pat: !github_api.has_personal_access_token(),
    pat: github_api.get_personal_access_token(),
    failed: false,
    running: false,
  }),

  watch: {
    pat() {
      github_api.set_personal_access_token(this.pat);
    },
  },
};
</script>

<style>
 .shake {
     animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
     transform: translate3d(0, 0, 0);
 }
 @keyframes shake {
     10%, 90% {
         transform: translate3d(-1px, 0, 0);
     }
     20%, 80% {
         transform: translate3d(2px, 0, 0);
     }
     30%, 50%, 70% {
         transform: translate3d(-4px, 0, 0);
     }
     40%, 60% {
         transform: translate3d(4px, 0, 0);
     }
 }
</style>
