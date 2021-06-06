import { STATUS_CODE } from '@sellerspot/universal-types';
import { RequestHandler } from 'express';
import TenantService from 'services/TenantService';

export const deleteTenant: RequestHandler = async (req, res) => {
    const deleteAccountStatus = await TenantService.deleteTenant();
    if (deleteAccountStatus) {
        res.status(STATUS_CODE.OK).send({ status: true });
    } else {
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).send({ status: false });
    }
};
