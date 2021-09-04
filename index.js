const core = require('@actions/core');
const { spawnSync } = require('child_process');

/*
 * Main function
 */

function check_maintenance_window(
    maintenance_window_start,
    maintenance_window_duration,
    maintenance_url
) {

    const time_begin = new Date(maintenance_window_start).getTime();
    const time_end   = time_begin + (
        (typeof(maintenance_window_duration)=="string")
        ? parseInt(maintenance_window_duration,10)
        : maintenance_window_duration
    );

    if ( isNaN(time_begin) ) {
        core.setFailed(`Invalid value '${maintenance_window_start}' for maintenance_window_start`);
        return `Please fix maintenance_window_start to be a valid date: ${maintenance_window_start}`;
    }
    if ( isNaN(maintenance_window_duration) ) {
        core.setFailed(`Invalid value '${maintenance_window_duration}' for maintenance_window_duration`);
        return `Please fix maintenance_window_duration to be a number of milliseconds: ${maintenance_window_duration}`;
    }

    const time_now = new Date().getTime();

    if ( time_begin < time_now && time_now < time_end ) {
        core.setFailed(`Please try again after ${new Date(time_end)}`);
        return (
            `Trying to push during a planned maintenance.
Please do one of the following:

a) wait until a better time
b) edit this worklfow and update the "maintenance-window-start" value

Maintenance window start: ${new Date(time_begin)}
Maintenance window duration: ${new Date(time_end)}`
                + ( maintenance_url ? `\nFor more information, see ${maintenance_url}` : '' )
        );
    }

    return "";

}


/*
 * Main section
 */

const message = check_maintenance_window(
    /* Used by unit tests: * /
    process.env.maintenance_window_start,
    process.env.maintenance_window_duration,
    process.env.maintenance_url
    /**/
    // Used in production:
    core.getInput("maintenance-window-start"),
    core.getInput("maintenance-window-duration"),
    core.getInput("maintenance-url")
    /**/
);

core.setOutput("message", message );
console.log(message);
