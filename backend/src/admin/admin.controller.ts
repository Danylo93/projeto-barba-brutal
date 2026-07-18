import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('tenants')
  getAllTenants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getAllTenants(pageNum, limitNum, search);
  }

  @Get('tenants/:id')
  getTenantById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTenantById(id);
  }

  @Put('tenants/:id/status')
  updateTenantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { ativo: boolean },
  ) {
    return this.adminService.updateTenantStatus(id, data.ativo);
  }

  @Get('revenue')
  getRevenueByMonth(@Query('months') months?: string) {
    const monthsNum = months ? parseInt(months, 10) : 12;
    return this.adminService.getRevenueByMonth(monthsNum);
  }

  @Get('top-tenants')
  getTopTenants(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getTopTenants(limitNum);
  }
}
