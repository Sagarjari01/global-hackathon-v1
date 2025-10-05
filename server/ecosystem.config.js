module.exports = {
      apps : [{
        name   : "judgment-server-dev",
        script : "./node_modules/.bin/ts-node",
        args: "./src/server.ts",
        watch  : ["src"], // Watch the src directory for changes in dev
        ignore_watch: ["node_modules", "logs"],
        instances: 1,
        exec_mode: "fork", // Use fork mode for ts-node
        env_development: { // Environment variables for development
          NODE_ENV: "development",
          PORT: 3001 // Or your desired dev port
        },
        log_date_format: "YYYY-MM-DD HH:mm:ss Z" // Optional: customize log date format
      }, {
        name   : "judgment-server-prod",
        script : "./dist/server.js", // Point to compiled js
        instances: 1,
        exec_mode: "fork",
        env_production: { 
          NODE_ENV: "production",
          PORT: 3000 
        },
        log_date_format: "YYYY-MM-DD HH:mm:ss Z"
      }]
    }
