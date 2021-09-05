#!/bin/sh

run_test() {

    export maintenance_window_start="$( date --iso-8601=seconds -d "$1" )"
    export maintenance_window_duration="$2"
    export maintenance_enabled="$3"
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
    "-2 hours" "3600000" "true" "(maintenance issue)" \
    "" "push outside of a maintenance window"

run_test \
    "-1 hour" "7200000" "true" "(maintenance issue)" \
    "message" "push inside of a maintenance window"

run_test \
    "-1 hour" "7200000" "" "(maintenance issue)" \
    "message" "push inside of a maintenance window"
