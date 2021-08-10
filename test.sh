#!/bin/sh

run_test() {

    export GITHUB_HEAD_REF="$1"
    export branch_regexp="^maint-"
    export maintenance_window_start="$( date --iso-8601=seconds -d "$2" )"
    export maintenance_window_end="$( date --iso-8601=seconds -d "$3" )"
    export maintenance_url="$4"
    OUTPUT="$( node index.js | grep -v ^::set-output )"

    if [ -z "$5" ]
    then
        if [ -z "$OUTPUT" ]
        then echo -n "ok "
        else echo -n "not ok "
        fi
    else
        if [ -n "$OUTPUT" ]
        then echo -n "ok "
        else echo -n "not ok "
        fi
    fi

    echo "$6"

}

echo "1..4"

run_test \
    non-maint-blah "-2 hours" "-1 hour" "(maintenance issue)" \
    "" "push a non-maintenance commit outside of a maintenance window"

run_test \
    maint-blah "-2 hours" "-1 hour" "(maintenance issue)" \
    "message" "push a maintenance commit outside of a maintenance window"

run_test \
    non-maint-blah "-1 hour" "+1 hour" "(maintenance issue)" \
    "message" "push a non-maintenance commit inside of a maintenance window"

run_test \
    maint-blah "-1 hour" "+1 hour" "(maintenance issue)" \
    "" "push a maintenance commit inside of a maintenance window"
