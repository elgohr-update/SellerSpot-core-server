import { CONFIG } from 'config/config';
import { MONGOOSE_MODELS } from 'config/mongooseModels';
import { ISubDomain, ISubDomainModel } from 'models/SubDomain';
import { ITenantModel } from 'models/Tenant';
import { domain } from 'process';
import { IResponse, ISubDomainResponse } from 'typings/request.types';

export const createSubDomain = async (
    data: Pick<ISubDomain, 'domainName' | 'tenantId'>,
): Promise<IResponse> => {
    try {
        if (!data.tenantId) throw 'Invalid data';
        if (data.domainName && (data.domainName.length < 3 || data.domainName.length > 15))
            throw 'domain name length exceeded, domain name should be minimum of 3 and maximum of 10 characters';
        const db = global.currentDb.useDb(CONFIG.BASE_DB_NAME); // id comes and mongoose id to converted to  string
        const TenantModel: ITenantModel = db.model(MONGOOSE_MODELS.TENANT);
        const tenant = await TenantModel.findById(data.tenantId);
        if (!tenant) throw 'Invalid Tenant';
        const SubDomainModel: ISubDomainModel = db.model(MONGOOSE_MODELS.SUB_DOMAIN);
        if ((await SubDomainModel.find({ domainName: data.domainName })).length)
            throw 'Domain Not Available! Try alternate domain!';
        const subDomain = await SubDomainModel.create({
            domainName: data.domainName,
            tenantId: data.tenantId,
        });
        tenant.subDomain = subDomain.id;
        await tenant.save();
        return Promise.resolve({
            status: true,
            statusCode: 200,
            data: {
                _id: subDomain.id,
                baseDomain: CONFIG.CLIENT_BASE_DOMAIN_FOR_APPS,
                createdAt: subDomain.createdAt,
                updatedAt: subDomain.updatedAt,
                domainName: subDomain.domainName,
                tenantId: subDomain.tenantId,
            } as ISubDomainResponse,
        });
    } catch (error) {
        return Promise.reject({
            status: false,
            statusCode: 400,
            data: [
                {
                    name: 'subDomainCreationFailure',
                    message: error.message ?? error,
                },
            ],
        } as IResponse);
    }
};

export const updateSubDomain = async (
    data: Pick<ISubDomain, 'domainName' | 'tenantId'>,
): Promise<IResponse> => {
    try {
        if (!data.tenantId) throw 'Invalid data';
        if (data.domainName && (data.domainName.length < 3 || data.domainName.length > 15))
            throw 'domain name length exceeded, domain name should be minimum of 3 and maximum of 10 characters';

        const db = global.currentDb.useDb(CONFIG.BASE_DB_NAME); // id comes and mongoose id to converted to  string
        const TenantModel: ITenantModel = db.model(MONGOOSE_MODELS.TENANT);
        const tenant = await TenantModel.findById(data.tenantId);
        if (!tenant) throw 'Invalid Tenant';

        const SubDomainModel: ISubDomainModel = db.model(MONGOOSE_MODELS.SUB_DOMAIN);
        const subDomain = await SubDomainModel.findById(tenant.subDomain);
        if (!subDomain) throw 'Invalid domain';

        if ((await SubDomainModel.find({ domainName: data.domainName })).length)
            throw 'Domain Not Available! Try alternate domain!';

        subDomain.domainName = data.domainName
            .replace(/[^a-zA-Z]+/g, '')
            .trim()
            .toLowerCase();

        await subDomain.save();

        return {
            status: true,
            statusCode: 200,
            data: {
                _id: subDomain.id,
                baseDomain: CONFIG.CLIENT_BASE_DOMAIN_FOR_APPS,
                createdAt: subDomain.createdAt,
                updatedAt: subDomain.updatedAt,
                domainName: subDomain.domainName,
                tenantId: subDomain.tenantId,
            } as ISubDomainResponse,
        };
    } catch (error) {
        return Promise.reject({
            status: false,
            statusCode: 400,
            data: [
                {
                    name: 'subdomainUpdationFailure',
                    message: error.message ?? error,
                },
            ],
        } as IResponse);
    }
};

export const deleteSubDomain = async (data: Pick<ISubDomain, 'tenantId'>): Promise<IResponse> => {
    try {
        if (!data.tenantId) throw 'Invalid data';
        const db = global.currentDb.useDb(CONFIG.BASE_DB_NAME); // id comes and mongoose id to converted to  string
        const TenantModel: ITenantModel = db.model(MONGOOSE_MODELS.TENANT);
        const tenant = await TenantModel.findById(data.tenantId);
        if (!tenant) throw 'Invalid Tenant';
        if (!tenant.subDomain) throw 'Tenant has no subdomain yet';

        const SubDomainModel: ISubDomainModel = db.model(MONGOOSE_MODELS.SUB_DOMAIN);
        const subDomain = await SubDomainModel.findById(tenant.subDomain);
        if (!subDomain) throw 'Invalid domain';
        await subDomain.delete();
        tenant.subDomain = null;
        await tenant.save();
        return Promise.resolve({
            status: true,
            statusCode: 200,
            data: 'Domain deleted Successfully',
        });
    } catch (error) {
        return Promise.reject({
            status: false,
            statusCode: 400,
            data: [
                {
                    name: 'subDomainDeletionFailure',
                    message: error.message ?? error,
                },
            ],
        } as IResponse);
    }
};

export const checkSubDomainAvailability = async (domainName: string): Promise<IResponse> => {
    try {
        const db = global.currentDb.useDb(CONFIG.BASE_DB_NAME); // id comes and mongoose id to converted to  string
        const SubDomainModel: ISubDomainModel = db.model(MONGOOSE_MODELS.SUB_DOMAIN);
        const isAvailable =
            domainName.length >= 3 &&
            domainName.length <= 15 &&
            (await SubDomainModel.find({ domainName: domainName })).length === 0;
        // domian suggestion can be given here in future iteration
        return Promise.resolve({
            status: true,
            statusCode: 200,
            data: {
                available: isAvailable,
            },
        });
    } catch (error) {
        return Promise.reject({
            status: false,
            statusCode: 400,
            data: [
                {
                    name: 'subDomainCheckAvailabilityFailure',
                    message: error.message ?? error,
                },
            ],
        } as IResponse);
    }
};
