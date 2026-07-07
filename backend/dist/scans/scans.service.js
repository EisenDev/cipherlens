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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let ScansService = class ScansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getScanSummary(userId) {
        const stats = await this.prisma.scan.groupBy({
            by: ['status'],
            where: {
                target: {
                    project: {
                        userId,
                    },
                },
            },
            _count: {
                _all: true,
            },
        });
        const summary = { total: 0, completed: 0, running: 0, queued: 0, failed: 0 };
        stats.forEach((item) => {
            const status = item.status.toLowerCase();
            const count = item._count._all;
            summary.total += count;
            if (status === 'completed')
                summary.completed = count;
            else if (status === 'running')
                summary.running = count;
            else if (status === 'queued')
                summary.queued = count;
            else if (status === 'failed')
                summary.failed = count;
        });
        return summary;
    }
    async getScans(userId, query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const whereClause = {
            target: {
                project: {
                    userId,
                },
            },
        };
        if (query.status) {
            whereClause.status = query.status.toUpperCase();
        }
        if (query.scanType) {
            whereClause.scanType = query.scanType.toUpperCase();
        }
        if (query.assetType) {
            whereClause.target = {
                ...whereClause.target,
                type: query.assetType.toUpperCase(),
            };
        }
        if (query.search) {
            whereClause.target = {
                ...whereClause.target,
                name: {
                    contains: query.search,
                    mode: 'insensitive',
                },
            };
        }
        const [total, data] = await Promise.all([
            this.prisma.scan.count({ where: whereClause }),
            this.prisma.scan.findMany({
                where: whereClause,
                include: {
                    target: {
                        select: {
                            name: true,
                            url: true,
                            type: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
        ]);
        return {
            current_page: page,
            per_page: limit,
            total,
            last_page: Math.ceil(total / limit),
            data,
        };
    }
};
exports.ScansService = ScansService;
exports.ScansService = ScansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ScansService);
//# sourceMappingURL=scans.service.js.map