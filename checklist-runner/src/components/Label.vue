<template>
    <v-chip
      v-if="started"
      :href="href"
      :color="status_colour"
      :disabled="!this.active"
      label
      :dark="status_colour!='yellow'"
    >
        {{status_message}}
    </v-chip>
    <v-progress-circular
      v-else
      indeterminate
    ></v-progress-circular>
</template>

<script>
export default {
  name: 'Label',

  props: ["started","active","completed","success","message","href"],

  computed: {
    status_colour() {
      if ( this.completed ) {
        return this.success ? "green" : "red";
      } else {
        return "yellow";
      }
    },
    status_message() {
      if ( !this.active ) return "inactive";
      if ( this.message ) return this.message.replace(/_/g, ' ');
      if ( this.completed ) {
        return this.success ? "success" : "problem";
      } else {
        return "loading";
      }
    },
  },
};
</script>
