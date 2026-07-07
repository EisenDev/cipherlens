"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScansController = void 0;
const common_1 = require("@nestjs/common");
const auth_middleware_1 = require("../middleware/auth.middleware");
const scans_service_1 = require("./scans.service");
const swagger_1 = require("@nestjs/swagger");
let ScansController = class ScansController {
    scansService;
    constructor(scansService) {
        this.scansService = scansService;
    }
    async getScanSummary(req) {
        return this.scansService.getScanSummary(req.user.id);
    }
    async getScans(req, page, limit, status, search, scanType, assetType) {
        return this.scansService.getScans(req.user.id, {
            page,
            limit,
            status,
            search,
            scanType,
            assetType,
        });
    }
};
exports.ScansController = ScansController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get scan summary stats' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Summary statistics object returned successfully.' }),
    (0, common_1.Get)('api/dashboard/scan-summary'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "getScanSummary", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get paginated list of scans with search and filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated scans object returned successfully.' }),
    (0, common_1.Get)('api/scans'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('scan_type')),
    __param(6, (0, common_1.Query)('asset_type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "getScans", null);
exports.ScansController = ScansController = __decorate([
    (0, swagger_1.ApiTags)('scans'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_middleware_1.AuthGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [scans_service_1.ScansService])
], ScansController);
//# sourceMappingURL=scans.controller.js.map