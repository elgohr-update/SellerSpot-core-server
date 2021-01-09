import { CONFIG } from 'config/config';
import { MONGOOSE_MODELS } from 'config/mongooseModels';
import { SubDomainModel, TenantModel } from 'models';
import { IResponse, ISubDomainResponse, ITokenPayload } from 'typings/request.types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { tenantController } from 'controllers';

export const SignUpTenant = async (data: TenantModel.ITenant): Promise<IResponse> => {
    const response: IResponse = {
        status: false,
        statusCode: 400,
        data: null,
    };
    try {
        const { email, name, password } = data;
        const db = global.currentDb.useDb(CONFIG.BASE_DB_NAME);
        const TenantModel: TenantModel.ITenantModel = db.model(MONGOOSE_MODELS.TENANT);
        if (!(await TenantModel.findOne({ email }))) {
            const tenant = await TenantModel.create({
                email,
                name,
                password: bcrypt.hashSync(password, 8),
            });
            response.status = true;
            response.statusCode = 200;
            const payload: ITokenPayload = {
                id: tenant._id,
                name: tenant.name,
                email: tenant.email,
            };
            // setting up tenant db for data isolation for the apps per tenant
            setTimeout(() => {
                // running asynchrously - if control over configuration is needed -  tenantController.setupTenant return a promise await and listen for response, response will be the type of IResponse
                tenantController.setupTenant(payload);
            });

            response.data = {
                ...payload,
                subDomain: {
                    _id: '',
                    baseDomain: CONFIG.CLIENT_BASE_DOMAIN_FOR_APPS,
                    createdAt: '',
                    domainName: '',
                    tenantId: tenant._id,
                    updatedAt: '',
                } as ISubDomainResponse,
                token: jwt.sign(payload, CONFIG.JWT_SECRET, {
                    expiresIn: '2 days', // check zeit/ms
                }),
            };
            return Promise.resolve(response);
        } else {
            response.data = [
                {
                    name: `alreadyFound`,
                    message: `Account with the email id already exist!, please login with your email and password`,
                },
            ];
            throw response;
        }
    } catch (error) {
        return Promise.reject(response);
    }
};

export const SignInTenant = async (
    data: Pick<TenantModel.ITenant, 'email' | 'password'>,
): Promise<IResponse> => {
    const response: IResponse = {
        status: false,
        statusCode: 400,
        data: null,
    };
    try {
        const { email, password } = data;
        const db = global.currentDb.useDb(CONFIG.BASE_DB_NAME);
        const TenantModel: TenantModel.ITenantModel = db.model(MONGOOSE_MODELS.TENANT);
        const tenant = await TenantModel.findOne({ email })
            .populate('subDomain', null, MONGOOSE_MODELS.SUB_DOMAIN)
            .populate('apps', null, MONGOOSE_MODELS.APP);
        if (bcrypt.compareSync(password, tenant.password)) {
            response.status = true;
            response.statusCode = 200;
            const payload: ITokenPayload = {
                id: tenant._id,
                name: tenant.name,
                email: tenant.email,
            };
            const subDomainDetails = <SubDomainModel.ISubDomain>tenant.subDomain ?? {
                domainName: '',
                tenantId: tenant._id,
                _id: '',
                createdAt: '',
                updatedAt: '',
            };
            response.data = {
                ...payload,
                subDomain: {
                    ...(<SubDomainModel.ISubDomain>{
                        _id: subDomainDetails._id,
                        domainName: subDomainDetails.domainName,
                        tenantId: subDomainDetails.tenantId,
                        createdAt: subDomainDetails.createdAt,
                        updatedAt: subDomainDetails.updatedAt,
                    }),
                    baseDomain: CONFIG.CLIENT_BASE_DOMAIN_FOR_APPS,
                } as ISubDomainResponse,
                apps: tenant.apps,
                token: jwt.sign(payload, CONFIG.JWT_SECRET, {
                    expiresIn: '2 days', // check zeit/ms
                }),
            };
            return Promise.resolve(response);
        } else {
            response.data = [
                {
                    name: `notFound`,
                    message: `We couldn't find the account!, please check the email or passowrd!`,
                },
            ];
            throw response;
        }
    } catch (error) {
        return Promise.reject(response);
    }
};

export const verifyToken = async (socket: Socket): Promise<IResponse> => {
    try {
        const { token }: { token: string } = socket.handshake.auth as { token: string };
        if (!token) {
            throw 'tokenNotFound';
        }
        const response: IResponse = await new Promise((resolve, reject) =>
            jwt.verify(token, CONFIG.JWT_SECRET, (err, decoded: ITokenPayload) => {
                if (err) {
                    reject('tokenExpired');
                }
                // on verificaiton success
                resolve({
                    status: true,
                    statusCode: 200,
                    data: decoded,
                } as IResponse);
            }),
        );
        return Promise.resolve(response);
    } catch (error) {
        return Promise.reject({
            status: false,
            statusCode: 401, // unauthorized
            data: [
                {
                    name: error,
                    message:
                        'Auth token expired or not found! ReAuthenticate to refresh the token.',
                },
            ],
        } as IResponse);
    }
};
