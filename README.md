# Planned Maintenance

Set a time window for your next planned maintenance, a regular expression to detect maintenance-related PRs, and optionally a URL with more information.  During the maintenance window, this action will only succeed for branches that match the regexp.  The rest of the time, this action will only succeed for branches that don't match the regexp.

This lets you gently discourage people from pushing unexpected changes for a while.  For example, if you need to modify a workflow that pushes a release to an external site, you might be concerned about something triggering it at the wrong moment.

## Inputs

### `branch-regexp`

**Required** A branch starting with this pattern indicates a maintenance branch (default: `maint-`)

### `maintenance-window-start`

**Required** Deny maintenance branches before this time, deny everything else after it

### `maintenance-window-end`

**Required** Deny maintenance branches after this time, deny everything else before it

### `maintenance-url`

**Optional** URL with more information about this maintenace, will be displayed in error output

## Outputs

### `message`

Explanation about why your branch was rejected

This message is also printed in the script's standad output.

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
          branch-regexp: ^maint-
          maintenance-window-start: "2021-01-01T06:00:00Z"
          maintenance-window-end: "2021-01-01T07:00:00Z"
          maintenance-url: "https://github.com/my-user/my-repo/issues/12345"
```

## Multi-repository usage

Maintenance often works across several repositories at once, so we would like to set the maintenance window in one location and have it apply to all associated repositories.

You could use [encrypted secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) to achieve this, but that can be quite clunky.  An alternative is to create a custom action that outputs your settings, then use that as input to the `planned-maintenance` action.

To create a custom action, fork the [planned-maintenance-times](https://github.com/andrew-sayers/planned-maintenance-times) repository or [use it as a template](https://github.com/andrew-sayers/planned-maintenance-times/generate).  Put your values in `index.js` and push the changes.  Then you can create a workflow like this:

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
        uses: your-username/your-planned-maintenance-times@main
      - name: Is now a good time?
        id: check
        uses: andrew-sayers/planned-maintenance@v1.0.0
        with:
          branch-regexp: ${{ steps.settings.outputs.branch-regexp }}
          maintenance-window-start: ${{ steps.settings.outputs.maintenance-window-start }}
          maintenance-window-end: ${{ steps.settings.outputs.maintenance-window-end }}
          maintenance-url: ${{ steps.settings.outputs.maintenance-url }}
```
