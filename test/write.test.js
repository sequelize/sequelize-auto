const fs = require('fs');
const { describe, before, after, it } = require('mocha');
const { expect } = require('chai');
const { AutoRelater } = require('../lib/auto-relater');
const { SequelizeAuto } = require('../lib/auto');
const buildTableData = require('./tabledata').buildRelatedTableData;

/** @type {string[]} */
let written = [];

/**
 * @param {import("../src/types").TableData} tableData
 * @param {import("../src/types").AutoOptions} options
 * @returns {Promise<void>}
 */
function write(tableData, options) {
  written = Object.keys(tableData.tables);
  return Promise.resolve();
}

describe("sequelize-auto write", function() {
  let td;
  before(async function() {
    td = buildTableData();
    const options = {
      // directory: './models',
      additional: {},
      dialect: 'mysql',
      lang: 'ts',
      caseModel: 'p',
      caseFile: 'l',
      caseProp: 'c',
      singularize: false,
      write,
    }
    // we've already done the build and relate steps, so we just need to write
    let auto = new SequelizeAuto(null, null, null, options);
    const tt = auto.generate(td);
    td.text = tt;
    await auto.write(td);
    return td;
  });

  after(function() {
  });

  describe("should write the data", function() {
    it("has written data", function() {
      let has = written.length > 0;
      expect(has).to.be.true;
    });
    it("has the models", function() {
      const modelFiles = ['customer', 'order', 'order_item', 'other_tag', 'product', 'product_tag', 'related_product', 'supplier', 'tag'];
      modelFiles.forEach(function(mf) {
        let has = written.includes(mf);
        expect(has).to.be.true;
      });
    });
  });


});