# Planned Maintenance

Automate maintenance by defining actions in JavaScript and using [the checklist runner](https://andrew-sayers.github.io/planned-maintenance/).

This repository includes an action that will only succeed outside the maintenance window.  For example, you might use this action to discourage people from pushing changes while maintenance is underway.

## Inputs

### `maintenance-window-start`

**Required** Time when the maintenance window will open.  After this point, the checklist will be enabled and the action will fail

### `maintenance-window-duration`

**Required** Number of milliseconds the maintenance window will remain open for

### `maintenance-window-enabled`

**Required** Whether to check the maintenance window at all

### `maintenance-url`

**Optional** URL with more information about this maintenance, will be displayed in error output

## Outputs

### `message`

Explains why your branch was rejected.

This message is also printed in the script's standard output.

## Example usage

```yaml
name: Planned maintenance

on: pull_request

jobs:
  check:
    runs-on: ubuntu-latest
    name: Is this branch allowed at this time?
    steps:
      - name: Is now a good time?
        id: check
        uses: andrew-sayers/planned-maintenance@v1.0.0
        with:
          maintenance-window-start: "2021-01-01T06:00:00Z"
          maintenance-window-duration: 360000,
          maintenance-url: "https://github.com/my-user/my-repo/issues/12345"
```

## Multi-repository usage

Maintenance often works across several repositories at once, so we would like to set the maintenance window in one location and have it apply to all associated repositories.

You could use [encrypted secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) to achieve this, but that can be quite clunky.  An alternative is to create a custom action that outputs your settings, then use that as input to the `planned-maintenance` action.

To create a custom action, fork the [planned-maintenance-info](https://github.com/andrew-sayers/planned-maintenance-info) repository or [use it as a template](https://github.com/andrew-sayers/planned-maintenance-info/generate).  Put your information in `index.js` and push the changes.  Then you can create a workflow like this:

```yaml
name: Planned maintenance

on: pull_request

jobs:
  check:
    runs-on: ubuntu-latest
    name: Is this branch allowed at this time?
    steps:
      - name: Get maintenance window
        id: settings
        uses: your-username/your-planned-maintenance-info@main
      - name: Is now a good time?
        id: check
        uses: andrew-sayers/planned-maintenance@v1.0.0
        with:
          maintenance-window-start: ${{ steps.settings.outputs.maintenance-window-start }}
          maintenance-window-duration: ${{ steps.settings.outputs.maintenance-window-duration }}
          maintenance-url: ${{ steps.settings.outputs.maintenance-url }}
```
