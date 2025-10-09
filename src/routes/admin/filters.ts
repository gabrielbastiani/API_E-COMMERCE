import { Router } from "express";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { FilterGroupController } from "../../controllers/filter/FilterGroupController";
import { UpdateCategoryFilterController } from '../../controllers/filter/UpdateCategoryFilterController';
import { FilterCmsController } from "../../controllers/filter/FilterCmsController";
import { FilterDeleteController } from "../../controllers/filter/FilterDeleteController";
import { StatusFilterController } from "../../controllers/filter/StatusFilterController";
import { GetFilterCategoriesController } from "../../controllers/filter/GetFilterCategoriesController";
import { CreateAndUpdateFilterController } from '../../controllers/filter/CreateAndUpdateFilterController';
import { getSearchFilters } from "../../controllers/filter/SearchFiltersController";
import { searchProducts } from "../../controllers/filter/ProductsController";

const router = Router();

const createAndUpdateFilter = new CreateAndUpdateFilterController();
const ctrlFilterGroup = new FilterGroupController();
const updateCategoryFilter = new UpdateCategoryFilterController();
const filterDeleteCtrl = new FilterDeleteController();

router.post("/filters/create", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), createAndUpdateFilter.handleCreate.bind(createAndUpdateFilter));
router.get("/filters/getAll", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), createAndUpdateFilter.handleGetAll.bind(createAndUpdateFilter));
router.get("/filters/get/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), createAndUpdateFilter.handleGetOne.bind(createAndUpdateFilter));
router.put("/filter/update/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), createAndUpdateFilter.handleUpdate.bind(createAndUpdateFilter));
router.delete("/filter/delete/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), createAndUpdateFilter.handleDelete.bind(createAndUpdateFilter));

router.post("/categoryFilters/create", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), updateCategoryFilter.handleCreate.bind(updateCategoryFilter));
router.get("/categoryFilters/getAll", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), updateCategoryFilter.handleGetAll.bind(updateCategoryFilter));
router.get("/categoryFilters/get/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), updateCategoryFilter.handleGetOne.bind(updateCategoryFilter));
router.put("/categoryFilters/update/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), updateCategoryFilter.handleUpdate.bind(updateCategoryFilter));
router.delete("/categoryFilters/delete/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), updateCategoryFilter.handleDelete.bind(updateCategoryFilter));

router.get("/products/busca", (req, res) => require("../../controllers/product/NavBarSearchProductStoreController").searchController(req, res));
router.post("/filterGroups/create", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), ctrlFilterGroup.handleCreate.bind(ctrlFilterGroup));
router.get("/filterGroups/getAll", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), ctrlFilterGroup.handleGetAll.bind(ctrlFilterGroup));
router.get("/filterGroups/group/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), ctrlFilterGroup.handleGetOne.bind(ctrlFilterGroup));
router.put("/filterGroups/update/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), ctrlFilterGroup.handleUpdate.bind(ctrlFilterGroup));
router.delete("/filterGroups/deleteGroup/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), ctrlFilterGroup.handleDelete.bind(ctrlFilterGroup));

router.get('/filter/categories', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new GetFilterCategoriesController().handle);
router.get('/filters/cms', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new FilterCmsController().handle);
router.delete('/filterData/delete', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), (req, res) => filterDeleteCtrl.handle(req, res));
router.put('/filter/status', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new StatusFilterController().handle);
router.get('/filters/detectAttributeKeys', async (req, res, next) => {
    try {
        const mod = await import('../../controllers/filter/DetectAttributeKeysController');
        const DetectAttributeKeysController = mod.DetectAttributeKeysController;
        const ctrl = new DetectAttributeKeysController();
        return ctrl.handle(req, res, next);
    } catch (err) {
        next(err);
    }
});
router.get("/filters/search", getSearchFilters);
router.get("/products/busca/page", searchProducts);

export default router;