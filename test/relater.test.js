const { describe, before, after, it } = require('mocha');
const { expect } = require('chai');
const _ = require('lodash');
const buildTableData = require('./tabledata').buildRelatedTableData;

describe("sequelize-auto relater", function() {
  let td;
  before(function() {
    td = buildTableData();
  });

  after(function() {
  });

  describe("should build the TableData", function() {
    it("has tables", function() {
      expect(td).not.to.be.null;
      expect(td.tables.order.Id.primaryKey).to.be.true;
    });
  });

  describe("should make relations based on foreign keys", function() {

    it("builds relation between Customer and Order", function() {

      expect(td.relations).not.to.be.null;

      let custorders = td.relations.filter(r => r.parentModel == "Customer" && r.childModel == "Order");
      expect(custorders.length).to.equal(1);
      expect(custorders[0].childProp).to.equal("orders");
      expect(custorders[0].parentProp).to.equal("customer");
    });

    it("builds two relations between Supplier and Product", function() {
      let supprod = td.relations.filter(r => r.parentModel == "Supplier" && r.childModel == "Product");
      expect(supprod.length).to.equal(2);
      let sup1 = supprod.find(r => r.parentId == "supplierId");
      expect(sup1.childProp).to.equal("products");
      let sup2 = supprod.find(r => r.parentId == "altSupplierId");
      expect(sup2.childProp).to.equal("altSupplierProducts");
    });

    it("builds relations between Product and RelatedProduct", function() {
      let relprod = td.relations.filter(r => r.parentModel == "Product" && r.childModel == "RelatedProduct");
      expect(relprod.length).to.equal(2);
      let rp1 = relprod.find(r => r.parentId == "productId");
      expect(rp1.parentProp).to.equal("product");
      expect(rp1.childProp).to.equal("relatedProducts");
      let rp2 = relprod.find(r => r.parentId == "relatedProductId");
      expect(rp2.parentProp).to.equal("relatedProduct");
      expect(rp2.childProp).to.equal("relatedProductRelatedProducts");
    });

    it("builds relations between Product and ProductTag", function() {
      let prodtag = td.relations.filter(r => r.parentModel == "Product" && r.childModel == "ProductTag");
      expect(prodtag.length).to.equal(1);
      expect(prodtag[0].parentId).to.equal("productId");
      expect(prodtag[0].parentProp).to.equal("product");
      expect(prodtag[0].childProp).to.equal("productTags");
    });

    it("builds relations between Tag and ProductTag", function() {
      let prodtag = td.relations.filter(r => r.parentModel == "Tag" && r.childModel == "ProductTag");
      expect(prodtag.length).to.equal(1);
      expect(prodtag[0].parentId).to.equal("tagId");
      expect(prodtag[0].parentProp).to.equal("tag");
      expect(prodtag[0].childProp).to.equal("productTags");
    });

    it("builds M2M relations between Product and Tag", function() {
      let prodtag = td.relations.filter(r => r.parentModel == "Tag" && r.childModel == "Product");
      expect(prodtag.length).to.equal(2);
      let pt1 = prodtag.find(r => r.joinModel == "ProductTag");
      expect(pt1.parentId).to.equal("tagId");
      expect(pt1.parentModel).to.equal("Tag");
      expect(pt1.parentProp).to.equal("tags");
      expect(pt1.childId).to.equal("productId");
      expect(pt1.childModel).to.equal("Product");
      expect(pt1.childProp).to.equal("productIdProductProductTags");
      expect(pt1.isM2M).to.equal(true);

      let pt2 = prodtag.find(r => r.joinModel == "OtherTag");
      expect(pt2.parentId).to.equal("tagId");
      expect(pt2.parentModel).to.equal("Tag");
      expect(pt2.parentProp).to.equal("tags");
      expect(pt2.childId).to.equal("productId");
      expect(pt2.childModel).to.equal("Product");
      expect(pt2.childProp).to.equal("productIdProducts");
      expect(pt2.isM2M).to.equal(true);
    });

    it("has unique prop names", function() {
      const parentModels = td.relations.map(r => r.parentModel);
      parentModels.forEach(function(pm) {
        const rels = td.relations.filter(r => r.parentModel == pm);
        const childProps = rels.map(r => r.childProp);
        const dupProps = dups(childProps);
        expect(dupProps.length, dupProps).to.equal(0);
      })
    });

  });

});

/** return values that are duplicated in the array */
function dups(arr) {
  return _(arr).groupBy().pickBy(x => x.length > 1).keys().value();
}
