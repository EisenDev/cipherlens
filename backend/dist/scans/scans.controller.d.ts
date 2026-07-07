import { ScansService } from './scans.service';
export declare class ScansController {
    private readonly scansService;
    constructor(scansService: ScansService);
    getScanSummary(req: any): Promise<{
        total: number;
        completed: number;
        running: number;
        queued: number;
        failed: number;
    }>;
    getScans(req: any, page?: number, limit?: number, status?: string, search?: string, scanType?: string, assetType?: string): Promise<{
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        data: ({
            target: {
                name: string;
                url: string;
                type: import(".prisma/client").$Enums.TargetType;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.ScanStatus;
            scanType: string;
            score: number | null;
            duration: number | null;
            summary: string | null;
            targetId: string;
            createdAt: Date;
            updatedAt: Date;
        })[];
    }>;
}
