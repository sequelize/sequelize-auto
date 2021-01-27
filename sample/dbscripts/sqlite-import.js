// node script to create sqlite db schema and populate with data
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

const dbpath = path.resolve(__dirname, "../northwind.sqlite");
const modelPath = path.resolve(__dirname,"./sqlite-sample-model.sql");
const dataPath = path.resolve(__dirname,"./sqlite-sample-data.sql");

const db = new sqlite3.Database(dbpath);

const modelScript = fs.readFileSync(modelPath, "utf-8");

return db.exec(modelScript, err => { 
  if (err) {
    console.log(err);
  } else {
    console.log("createScript success");
    const dataScript = fs.readFileSync(dataPath, "utf-8");
    db.exec(dataScript, err2 => {
      if (err2) {
        console.log(err2);
      } else {
        console.log("dataScript success");
        db.get('select count(*) as orderCount from Orders', (err3, row) => {
          if (err3) {
            console.log(err3);
          } else {
            console.log(row);
          }
        });
      }
    });
  }
});
