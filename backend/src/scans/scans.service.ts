import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ScansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch aggregated summary of scans for the current user.
   */
  async getScanSummary(userId: string) {
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
      
      if (status === 'completed') summary.completed = count;
      else if (status === 'running') summary.running = count;
      else if (status === 'queued') summary.queued = count;
      else if (status === 'failed') summary.failed = count;
    });

    return summary;
  }

  /**
   * Fetch paginated scans with search and filter parameters.
   */
  async getScans(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      scanType?: string;
      assetType?: string;
    },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
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
}
