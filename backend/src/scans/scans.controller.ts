import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../middleware/auth.middleware';
import { ScansService } from './scans.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('scans')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @ApiOperation({ summary: 'Get scan summary stats' })
  @ApiResponse({ status: 200, description: 'Summary statistics object returned successfully.' })
  @Get('api/dashboard/scan-summary')
  async getScanSummary(@Req() req: any) {
    return this.scansService.getScanSummary(req.user.id);
  }

  @ApiOperation({ summary: 'Get paginated list of scans with search and filters' })
  @ApiResponse({ status: 200, description: 'Paginated scans object returned successfully.' })
  @Get('api/scans')
  async getScans(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('scan_type') scanType?: string,
    @Query('asset_type') assetType?: string,
  ) {
    return this.scansService.getScans(req.user.id, {
      page,
      limit,
      status,
      search,
      scanType,
      assetType,
    });
  }
}
