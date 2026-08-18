const { types } = require("pg");

// Postgres DATE (OID 1082) is parsed by node-postgres into a local-time JS
// Date by default; serializing that to JSON converts it to UTC and can
// shift the calendar date depending on the server's timezone. Returning
// the raw "YYYY-MM-DD" string instead keeps it exact and timezone-proof.
types.setTypeParser(1082, (value) => value);
