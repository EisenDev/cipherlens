"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    logger = new common_1.Logger('ExceptionFilter');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Something went wrong.';
        let errors = undefined;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const resContent = exception.getResponse();
            if (typeof resContent === 'object' && resContent !== null) {
                if (resContent.success === false && resContent.errors) {
                    return response.status(status).json(resContent);
                }
                if (Array.isArray(resContent.message)) {
                    errors = resContent.message.map((msg) => ({
                        field: 'validation',
                        message: msg,
                    }));
                }
                else {
                    message = resContent.message || exception.message;
                }
            }
            else {
                message = exception.message;
            }
        }
        else {
            const err = exception;
            this.logger.error(`Internal System Error: ${err?.message}`, err?.stack);
            if (process.env.NODE_ENV === 'production') {
                message = 'An unexpected internal error occurred.';
            }
            else {
                message = err?.message || 'Something went wrong.';
            }
        }
        const payload = {
            success: false,
            message,
        };
        if (errors) {
            payload.errors = errors;
        }
        return response.status(status).json(payload);
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=error.filter.js.map