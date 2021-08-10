const core = require('@actions/core');
const { spawnSync } = require('child_process');

/*
 * The unix `date` command has a more flexible date parser than node
 */
function parse_date( date ) {
    const process = spawnSync(
        'date',
        [ '+%s', '-d', date ],
        { encoding: 'utf-8' }
    );
    const time = process.stdout;
    if ( process.error || time.search(/\d/) == -1 ) {
        return NaN;
    } else {
        return parseInt(time);
    }
}

/*
 * Main function
 */

function check_maintenance_window(
    branch_name,
    branch_regexp,
    maintenance_window_start,
    maintenance_window_end,
    maintenance_url
) {

    const is_maintenance_branch = branch_name.search( new RegExp(branch_regexp) ) != -1;
    const time_begin = parse_date(maintenance_window_start);
    const time_end   = parse_date(maintenance_window_end   );

    if ( isNaN(time_begin) ) {
        core.setFailed(`Invalid value for maintenance_window_start`);
        return `Please fix maintenance_window_start to be a valid date: ${maintenance_window_start}`;
    }
    if ( isNaN(time_end  ) ) {
        core.setFailed(`Invalid value for maintenance_window_end`);
        return `Please fix maintenance_window_end to be a valid date: ${maintenance_window_end}`;
    }

    const time_now = new Date().getTime() / 1000;
    const within_maintenance_window = parseInt(time_begin) < time_now && time_now < parseInt(time_end);

    let message_suffix = `Please do one of the following:

a) wait until a better time
b) edit this worklfow and update the "maintenance-window-start" and "maintenance-window-end" values
c) rename this branch to match /${branch_regexp}/

Maintenance window start: ${maintenance_window_start}
Maintenance window end: ${maintenance_window_end}`;
    if ( maintenance_url ) {
        message_suffix += `\nFor more information, see ${maintenance_url}`;
    }

    if ( within_maintenance_window ) {

        if ( !is_maintenance_branch ) {
            core.setFailed(`Please try again after ${maintenance_window_end}`);
            return `Trying to push normal branch "${branch_name}" during a maintenance.
${message_suffix}`;
        }

    } else {

        if ( is_maintenance_branch ) {
            core.setFailed(`Please try again between ${maintenance_window_start} and ${maintenance_window_end}`);
            return`Trying to push maintenance branch "${branch_name}" outside of a maintenance window.
${message_suffix}`;
        }

    }

    return "";

}


/*
 * Main section
 */

const message = check_maintenance_window(
    process.env.GITHUB_HEAD_REF,
    /* Used by unit tests: * /
    process.env.branch_regexp,
    process.env.maintenance_window_start,
    process.env.maintenance_window_end,
    process.env.maintenance_url
    /**/
    // Used in production:
    core.getInput("branch-regexp") || "^maint-",
    core.getInput("maintenance-window-start"),
    core.getInput("maintenance-window-end"),
    core.getInput("maintenance-url")
    /**/
);

core.setOutput("message", message );
console.log(message);
