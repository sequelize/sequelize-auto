const { expect } = require('chai');
const { describe, it } = require('mocha');
const { recase } = require('../lib/types');

describe('sequelize-auto types', function() {
  it('recase kebab-case', function() {
    const recasedString = recase('k', 'related_product');
    expect(recasedString).to.be.equal('related-product');
  });

  it('recase UPPER_CASE', function() {
    const recasedString = recase('u', 'related_product');
    expect(recasedString).to.be.equal('RELATED_PRODUCT');
  });
});
