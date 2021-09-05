<template>
    <v-app>

        <v-main>
            <template v-if="error">
                Please fix the following error(s):
                <pre>{{error}}</pre>
            </template>
            <v-stepper v-else v-model="step_no" style="margin-bottom:64px" vertical>
                <Step
                  :data="{title:'Setup',actions:[{action:'setup'}]}"
                  :step="1"
                  :steps="steps"
                  :complete="step_no > 1"
                  :disabled="status!='window-open'"
                />
                <Step
                  v-for="(step,n) in steps"
                  :key="n"
                  :data="step"
                  :step="n+2"
                  :complete="step_no > n+2"
                  :disabled="status!='window-open'"
                />
                <Step
                  :data="{title:'Teardown',actions:[{action:'teardown'}]}"
                  :step="steps.length+2"
                  :steps="steps"
                  :complete="false"
                  :disabled="status!='window-open'"
                />
            </v-stepper>
        </v-main>

        <v-app-bar
          :color="status_colour"

          style="position:fixed;bottom:0"
            >
            <v-btn
              :disabled="step_no == 1"
              color="primary"
              @click="--step_no"
              style="float:left"
            >
                <v-icon>mdi-arrow-left</v-icon>
                Prev
            </v-btn>
            <v-spacer></v-spacer>
            <a style="color:black" :href="maintenance_url" v-html="status_message"></a>
            <v-spacer></v-spacer>
            <v-btn
              :disabled="step_no == steps.length+2"
              color="primary"
              @click="++step_no"
              style="float:right"
            >
                Next
                <v-icon>mdi-arrow-right</v-icon>
            </v-btn>
        </v-app-bar>

    </v-app>
</template>

<script>
import Step from './components/Step';
import github_api from './github-api.js';

export default {
  name: 'App',

  components: {
    Step,
  },

  data: () => ({
    status: 'initialising',
    maintenance_data: {},
    step_no: 0,
    error: "",
    time_to_next_event: NaN,
  }),

  computed: {

    status_colour() {
      switch ( this.status ) {
        case 'before-start': return 'yellow darken-1';
        case 'window-open' : return 'green';
        case 'window-disabled':
        case 'window-closed': return 'red';
        default: return 'blue-grey';
      }
    },
    status_message() {
      const clock_text = (
        [
          Math.floor( this.time_to_next_event / (60*60), ),
          Math.floor( this.time_to_next_event / 60, ) % 60,
          Math.floor( this.time_to_next_event ) % 60,
        ].map( t => ( t < 10 ? '0' : '' ) + t )
         .join(':')
      );
      switch ( this.status ) {
        case 'before-start': return `Maintenance window will open in ${clock_text} for ${Math.floor(this.duration/(60*1000))} minutes`;
        case 'window-open' : return `Maintenance window open!  Will close in ${clock_text}`;
        case 'window-closed': return 'Maintenance window closed';
        case 'window-disabled': return 'Maintenance window disabled';
        default: return `Maintenance countdown.  To use this page, create a URL like: <tt>${location.href.replace(/#.*/,'')}#<em>//example.com/info.js</em></tt>`;
      }
    },

    maintenance_url() {
      return this.maintenance_data["maintenance-url"];
    },
    default_issue_id() {
      return this.maintenance_data["maintenance-url"].replace( /.*\/issues\/([0-9]+).*/, "$1" );
    },
    start() {
      return new Date( this.maintenance_data["maintenance-window-start"] ).getTime();
    },
    duration() {
      return this.maintenance_data["maintenance-window-duration"];
    },
    end() {
      return this.start + this.duration;
    },
    steps() {
      return (this.maintenance_data["maintenance-steps"]||[])
        .filter( step => (step.actions||[]).length );
    },

  },

  methods: {

    update() {
      const now = new Date().getTime();
      if ( !this.maintenance_data["maintenance-window-enabled"] ) {
        this.status = "window-disabled";
      } else if ( now < this.start ) {
        this.status = "before-start";
        this.time_to_next_event = ( this.start - now ) / 1000;
      } else if ( now < this.end ) {
        this.status = "window-open";
        this.time_to_next_event = ( this.end - now ) / 1000;
      } else {
        this.status = "window-closed";
      }
    },

    load_data(url) {
      const old_handle_data = window.handle_data,
            script = document.createElement("SCRIPT")
      ;
      window.handle_data = data => {

        window.handle_data = old_handle_data;
        this.maintenance_data = data;

        this.update();

        github_api.set_error_reporter = error => this.error = error;
        this.steps.forEach(
          step => step.actions.forEach( action => {
            this.$set( action, "data", {} );
            this.$set( action, "status", {} );
          })
        );
        github_api.prepare_steps( this.steps );

        setInterval( () => this.update(), 500 );
        this.status = "initialised";
        this.$nextTick(
          () => this.step_no = parseInt(sessionStorage.getItem('step_no')||'1',10)||1
        );
      };
      script.setAttribute( "src", url );
      document.head.appendChild(script);
    },

  },

  watch: {
    step_no() {
      if ( this.maintenance_data ) {
        sessionStorage.setItem('step_no',this.step_no);
      }
    },
  },


  mounted() {
    if ( location.hash.length ) {
      let hash = location.hash.substr(1);
      if ( hash.search(/:\/\//) == -1 ) hash = 'https://' + hash;
      this.load_data(hash);
      this.status = "loading";
    } else {
      this.status = "location-required";
    }
  },

};
</script>
