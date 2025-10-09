import { Router } from "express";
import { isAuthenticatedCustomer } from "../../middlewares/isAuthenticatedCustomer";
import { CreateAddressCustomerController } from "../../controllers/users/customers/address/CreateAddressCustomerController";
import { ListAddressCustomerController } from "../../controllers/users/customers/address/ListAddressCustomerController";
import { DeleteAddressController } from "../../controllers/users/customers/address/DeleteAddressController";
import { UpdateAddressController } from "../../controllers/users/customers/address/UpdateAddressController";

const router = Router();

router.post('/address/customer/create', new CreateAddressCustomerController().handle);
router.get('/customer/address/list', isAuthenticatedCustomer, new ListAddressCustomerController().handle);
router.delete('/customer/address/delete', isAuthenticatedCustomer, new DeleteAddressController().handle);
router.put('/customer/address/update', isAuthenticatedCustomer, new UpdateAddressController().handle);

export default router;