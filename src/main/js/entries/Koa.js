
'use strict';

/**
 * @author palmtale
 * @since 2017/5/2.
 */


import NodeOAuthServer, {
    Request,
    Response,
    UnauthorizedRequestError
} from 'oauth2-server';


class KoaOAuthServer {

    server = null;

    constructor(options) {
        //TODO Actually it is not required co.
        // for (const fn in options.model) {
        //     options.model[fn] = co.wrap(options.model[fn]);
        // }

        this.server = new NodeOAuthServer(options);
    }
    /**
     * Authentication Middleware.
     *
     * Returns a middleware that will validate a token.
     *
     * (See: https://tools.ietf.org/html/rfc6749#section-7)
     */
    authenticate = async (ctx, next) => {
            const request = new Request(ctx.request);

            try {
                ctx.state.oauth = {
                    token: await this.server.authenticate(request)
                };
            } catch (e) {
                return this.handleError(e);
            }

            await next();
        };

    /**
     * Authorization Middleware.
     *
     * Returns a middleware that will authorize a client to request tokens.
     *
     * (See: https://tools.ietf.org/html/rfc6749#section-3.1)
     */
    authorize = async (ctx, next) => {
            const request = new Request(ctx.request);
            const response = new Response(ctx.response);

            try {
                ctx.state.oauth = {
                    code: await this.server.authorize(request, response)
                };

                this.handleResponse(response);
            } catch (e) {
                return this.handleError(e, response);
            }

            await next();
        };

    /**
     * Grant Middleware
     *
     * Returns middleware that will grant tokens to valid requests.
     *
     * (See: https://tools.ietf.org/html/rfc6749#section-3.2)
     */
    token = async (ctx, next) => {
            const request = new Request(ctx.request);
            const response = new Response(ctx.response);

            try {
                const token = await this.server.token(request, response);
                ctx.state.oauth = {
                    token: token
                };

                this.handleResponse(ctx, response);
            } catch (e) {
                return this.handleError(e, response);
            }

            await next();
        };

    handleResponse = (ctx, response) => {
        ctx.res.statusCode = response.status;
        for(const header in response.headers){
            ctx.res.setHeader(header, response.headers[header]);
        }
        ctx.res.setHeader('content-type', 'application/json;charset=UTF-8');
        ctx.res.end(JSON.stringify(response.body));
    };

    handleError = (e, ctx, response) => {
        if (response) {
            ctx.res.setHeader(response.headers);
        }

        if (e instanceof UnauthorizedRequestError) {
            ctx.status = e.code;
        } else {
            ctx.body = { error: e.name, error_description: e.message };
            ctx.status = e.code;
        }
        return ctx.app.emit('error', e, this);
    };
}

export default KoaOAuthServer;