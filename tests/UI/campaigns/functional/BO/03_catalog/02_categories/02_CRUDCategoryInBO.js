require('module-alias/register');

const {expect} = require('chai');

// Import utils
const helper = require('@utils/helpers');
const files = require('@utils/files');
const loginCommon = require('@commonTests/loginBO');

// Import pages
const LoginPage = require('@pages/BO/login');
const DashboardPage = require('@pages/BO/dashboard');
const CategoriesPage = require('@pages/BO/catalog/categories');
const AddCategoryPage = require('@pages/BO/catalog/categories/add');
const FOBasePage = require('@pages/FO/FObasePage');
const SiteMapPage = require('@pages/FO/siteMap');

// Import data
const CategoryFaker = require('@data/faker/category');

// Import test context
const testContext = require('@utils/testContext');

const baseContext = 'functional_BO_catalog_categories_CRUDCategoriesInBO';


let browserContext;
let page;
let numberOfCategories = 0;

const createCategoryData = new CategoryFaker();
const createSubCategoryData = new CategoryFaker({name: 'subCategoryToCreate'});
const editCategoryData = new CategoryFaker({displayed: false, name: `update${createCategoryData.name}`});

// Init objects needed
const init = async function () {
  return {
    loginPage: new LoginPage(page),
    dashboardPage: new DashboardPage(page),
    categoriesPage: new CategoriesPage(page),
    addCategoryPage: new AddCategoryPage(page),
    foBasePage: new FOBasePage(page),
    siteMapPage: new SiteMapPage(page),
  };
};

// Create, Read, Update and Delete Category
describe('Create, Read, Update and Delete Category', async () => {
  // before and after functions
  before(async function () {
    browserContext = await helper.createBrowserContext(this.browser);
    page = await helper.newTab(browserContext);

    this.pageObjects = await init();
  });

  after(async () => {
    await helper.closeBrowserContext(browserContext);

    /* Delete the generated images */
    await Promise.all([
      files.deleteFile(`${createCategoryData.name}.jpg`),
      files.deleteFile(`${createSubCategoryData.name}.jpg`),
      files.deleteFile(`${editCategoryData.name}.jpg`),
    ]);
  });

  // Login into BO and go to categories page
  loginCommon.loginBO();

  it('should go to "Catalog>Categories" page', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'goToCategoriesPage', baseContext);

    await this.pageObjects.dashboardPage.goToSubMenu(
      this.pageObjects.dashboardPage.catalogParentLink,
      this.pageObjects.dashboardPage.categoriesLink,
    );

    await this.pageObjects.categoriesPage.closeSfToolBar();

    const pageTitle = await this.pageObjects.categoriesPage.getPageTitle();
    await expect(pageTitle).to.contains(this.pageObjects.categoriesPage.pageTitle);
  });

  it('should reset all filters and get number of categories in BO', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'resetFirst', baseContext);

    numberOfCategories = await this.pageObjects.categoriesPage.resetAndGetNumberOfLines();
    await expect(numberOfCategories).to.be.above(0);
  });

  // 1 : Create category and subcategory then go to FO to check the existence of the new categories
  describe('Create Category and subcategory in BO and check it in FO', async () => {
    describe('Create Category and check it in FO', async () => {
      it('should go to add new category page', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'goToNewCategoryPage', baseContext);

        await this.pageObjects.categoriesPage.goToAddNewCategoryPage();
        const pageTitle = await this.pageObjects.addCategoryPage.getPageTitle();
        await expect(pageTitle).to.contains(this.pageObjects.addCategoryPage.pageTitleCreate);
      });

      it('should create category and check the categories number', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'createCategory', baseContext);

        const textResult = await this.pageObjects.addCategoryPage.createEditCategory(createCategoryData);
        await expect(textResult).to.equal(this.pageObjects.categoriesPage.successfulCreationMessage);

        const numberOfCategoriesAfterCreation = await this.pageObjects.categoriesPage.getNumberOfElementInGrid();
        await expect(numberOfCategoriesAfterCreation).to.be.equal(numberOfCategories + 1);
      });

      it('should search for the new category and check result', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'searchCreatedCategory', baseContext);

        await this.pageObjects.categoriesPage.resetFilter();

        await this.pageObjects.categoriesPage.filterCategories(
          'input',
          'name',
          createCategoryData.name,
        );

        const numberOfCategoriesAfterFilter = await this.pageObjects.categoriesPage.getNumberOfElementInGrid();
        await expect(numberOfCategoriesAfterFilter).to.be.at.most(numberOfCategories);

        for (let i = 1; i <= numberOfCategoriesAfterFilter; i++) {
          const textColumn = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(i, 'name');
          await expect(textColumn).to.contains(createCategoryData.name);
        }
      });

      it('should go to FO and check the created category', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'checkCreatedCategoryFO', baseContext);

        const categoryID = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'id_category');

        // View Shop
        page = await this.pageObjects.categoriesPage.viewMyShop();
        this.pageObjects = await init();

        // Change FO language
        await this.pageObjects.foBasePage.changeLanguage('en');

        // Go to sitemap page
        await this.pageObjects.foBasePage.clickAndWaitForNavigation(this.pageObjects.foBasePage.siteMapLink);
        const pageTitle = await this.pageObjects.siteMapPage.getPageTitle();
        await expect(pageTitle).to.equal(this.pageObjects.siteMapPage.pageTitle);

        // Check category name
        const categoryName = await this.pageObjects.siteMapPage.getCategoryName(categoryID);
        await expect(categoryName).to.contains(createCategoryData.name);

        // Go back to BO
        page = await this.pageObjects.foBasePage.closePage(browserContext, 0);
        this.pageObjects = await init();
      });
    });

    /* test related to the bug described in this issue https://github.com/PrestaShop/PrestaShop/issues/15588 */
    describe('Create Subcategory and check it in FO', async () => {
      it('should display the subcategories table related to the created category', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'displaySubcategoriesForCreatedCategory', baseContext);

        await this.pageObjects.categoriesPage.goToViewSubCategoriesPage(1);
        const pageTitle = await this.pageObjects.categoriesPage.getPageTitle();
        await expect(pageTitle).to.contains(createCategoryData.name);
      });

      it('should go to add new category page', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'goToNewSubcategoryPage', baseContext);

        await this.pageObjects.categoriesPage.goToAddNewCategoryPage();
        const pageTitle = await this.pageObjects.addCategoryPage.getPageTitle();
        await expect(pageTitle).to.contains(this.pageObjects.addCategoryPage.pageTitleCreate);
      });

      it('should create a subcategory', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'createSubcategory', baseContext);

        const textResult = await this.pageObjects.addCategoryPage.createEditCategory(createSubCategoryData);
        await expect(textResult).to.equal(this.pageObjects.categoriesPage.successfulCreationMessage);
      });

      it('should search for the subcategory and check result', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'searchForCreatedSubcategory', baseContext);

        await this.pageObjects.categoriesPage.resetFilter();

        await this.pageObjects.categoriesPage.filterCategories(
          'input',
          'name',
          createSubCategoryData.name,
        );

        const textColumn = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'name');
        await expect(textColumn).to.contains(createSubCategoryData.name);
      });

      it('should go to FO and check the created Subcategory', async function () {
        await testContext.addContextItem(this, 'testIdentifier', 'checkCreatedSubcategoryFO', baseContext);

        const categoryID = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'id_category');

        // View shop
        page = await this.pageObjects.categoriesPage.viewMyShop();
        this.pageObjects = await init();

        // Change language in FO
        await this.pageObjects.foBasePage.changeLanguage('en');

        // Go to sitemap page
        await this.pageObjects.foBasePage.clickAndWaitForNavigation(this.pageObjects.foBasePage.siteMapLink);
        const pageTitle = await this.pageObjects.siteMapPage.getPageTitle();
        await expect(pageTitle).to.equal(this.pageObjects.siteMapPage.pageTitle);

        // Check category
        const categoryName = await this.pageObjects.siteMapPage.getCategoryName(categoryID);
        await expect(categoryName).to.contains(createSubCategoryData.name);

        // Go back to BO
        page = await this.pageObjects.foBasePage.closePage(browserContext, 0);
        this.pageObjects = await init();
      });
    });
  });

  // 2 : View Category and check the subcategories related
  describe('View Category Created', async () => {
    it('should go to "Catalog>Categories" page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToCategoriesPageToViewCreatedCategory', baseContext);

      await this.pageObjects.categoriesPage.goToSubMenu(
        this.pageObjects.categoriesPage.catalogParentLink,
        this.pageObjects.categoriesPage.categoriesLink,
      );

      const pageTitle = await this.pageObjects.categoriesPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.categoriesPage.pageTitle);
    });

    it('should filter list by name', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'filterToViewCreatedCategory', baseContext);

      await this.pageObjects.categoriesPage.resetFilter();

      await this.pageObjects.categoriesPage.filterCategories(
        'input',
        'name',
        createCategoryData.name,
      );

      const textColumn = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'name');
      await expect(textColumn).to.contains(createCategoryData.name);
    });

    it('should click on view category', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToViewCreatedCategoryPage', baseContext);

      await this.pageObjects.categoriesPage.goToViewSubCategoriesPage(1);
      const pageTitle = await this.pageObjects.categoriesPage.getPageTitle();
      await expect(pageTitle).to.contains(createCategoryData.name);
    });

    it('should check subcategories list', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'checkSubcategoriesForCreatedCategory', baseContext);

      await this.pageObjects.categoriesPage.resetFilter();

      await this.pageObjects.categoriesPage.filterCategories(
        'input',
        'name',
        createSubCategoryData.name,
      );

      const textColumn = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'name');
      await expect(textColumn).to.contains(createSubCategoryData.name);
    });
  });

  // 3 : Update category and check that category isn't displayed in FO (displayed = false)
  describe('Update Category created', async () => {
    it('should go to "Catalog>Categories" page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToCategoriesPageToUpdate', baseContext);

      await this.pageObjects.categoriesPage.goToSubMenu(
        this.pageObjects.categoriesPage.catalogParentLink,
        this.pageObjects.categoriesPage.categoriesLink,
      );

      const pageTitle = await this.pageObjects.categoriesPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.categoriesPage.pageTitle);
    });

    it('should filter list by name', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'filterToUpdate', baseContext);

      await this.pageObjects.categoriesPage.resetFilter();

      await this.pageObjects.categoriesPage.filterCategories(
        'input',
        'name',
        createCategoryData.name,
      );

      const textColumn = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'name');
      await expect(textColumn).to.contains(createCategoryData.name);
    });

    it('should go to edit category page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToEditCategoryPage', baseContext);

      await this.pageObjects.categoriesPage.goToEditCategoryPage(1);
      const pageTitle = await this.pageObjects.addCategoryPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.addCategoryPage.pageTitleEdit + createCategoryData.name);
    });

    it('should update the category', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'updateCategory', baseContext);

      const textResult = await this.pageObjects.addCategoryPage.createEditCategory(editCategoryData);
      await expect(textResult).to.equal(this.pageObjects.categoriesPage.successfulUpdateMessage);

      const numberOfCategoriesAfterUpdate = await this.pageObjects.categoriesPage.resetAndGetNumberOfLines();
      await expect(numberOfCategoriesAfterUpdate).to.be.equal(numberOfCategories + 1);
    });

    it('should search for the new category and check result', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'searchForUpdatedCategory', baseContext);

      await this.pageObjects.categoriesPage.resetFilter();

      await this.pageObjects.categoriesPage.filterCategories(
        'input',
        'name',
        editCategoryData.name,
      );

      const textColumn = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'name');
      await expect(textColumn).to.contains(editCategoryData.name);
    });

    it('should go to FO and check that the category does not exist', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'checkUpdatedCategoryFO', baseContext);

      const categoryID = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'id_category');

      // View shop
      page = await this.pageObjects.categoriesPage.viewMyShop();
      this.pageObjects = await init();

      // Change FO language
      await this.pageObjects.foBasePage.changeLanguage('en');

      // Go to sitemap page
      await this.pageObjects.foBasePage.clickAndWaitForNavigation(this.pageObjects.foBasePage.siteMapLink);
      const pageTitle = await this.pageObjects.siteMapPage.getPageTitle();
      await expect(pageTitle).to.equal(this.pageObjects.siteMapPage.pageTitle);

      // Check category name
      const categoryName = await this.pageObjects.siteMapPage.isVisibleCategory(categoryID);
      await expect(categoryName).to.be.false;

      // Go back to BO
      page = await this.pageObjects.foBasePage.closePage(browserContext, 0);
      this.pageObjects = await init();
    });
  });

  // 4 : Delete Category from BO
  describe('Delete Category', async () => {
    it('should go to "Catalog>Categories" page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToCategoriesPageToDelete', baseContext);

      await this.pageObjects.categoriesPage.goToSubMenu(
        this.pageObjects.categoriesPage.catalogParentLink,
        this.pageObjects.categoriesPage.categoriesLink,
      );

      const pageTitle = await this.pageObjects.categoriesPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.categoriesPage.pageTitle);
    });

    it('should filter list by name', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'filterToDelete', baseContext);

      await this.pageObjects.categoriesPage.resetFilter();

      await this.pageObjects.categoriesPage.filterCategories(
        'input',
        'name',
        editCategoryData.name,
      );

      const textColumn = await this.pageObjects.categoriesPage.getTextColumnFromTableCategories(1, 'name');
      await expect(textColumn).to.contains(editCategoryData.name);
    });

    it('should delete category', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'deleteCategory', baseContext);

      const textResult = await this.pageObjects.categoriesPage.deleteCategory(1);
      await expect(textResult).to.equal(this.pageObjects.categoriesPage.successfulDeleteMessage);

      const numberOfCategoriesAfterDeletion = await this.pageObjects.categoriesPage.resetAndGetNumberOfLines();
      await expect(numberOfCategoriesAfterDeletion).to.be.equal(numberOfCategories);
    });
  });
});
