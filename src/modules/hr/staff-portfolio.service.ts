import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateStaffAchievementDto,
  CreateStaffCertificateDto,
  UpdateStaffAchievementDto,
  UpdateStaffCertificateDto,
} from './dto/hr.dto';
import { StaffAchievement } from './entities/staff-achievement.entity';
import { StaffCertificate } from './entities/staff-certificate.entity';
import { StaffMember } from './entities/staff-member.entity';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';

/**
 * Xodimning sertifikatlari va yutuqlari (portfolio) CRUD'i. Har bir amal avval
 * xodim mavjudligini tekshiradi.
 */
@Injectable()
export class StaffPortfolioService {
  constructor(
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    @InjectRepository(StaffCertificate) private readonly certificates: Repository<StaffCertificate>,
    @InjectRepository(StaffAchievement) private readonly achievements: Repository<StaffAchievement>,
    private readonly tenant: TenantContextService,
  ) {}

  // ─── Sertifikatlar ─────────────────────────────────────────────────────────

  async listCertificates(staffId: string): Promise<StaffCertificate[]> {
    await this.ensureStaff(staffId);
    return this.certificates.find({
      where: { staffMemberId: staffId },
      order: { expiresAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async createCertificate(staffId: string, dto: CreateStaffCertificateDto): Promise<StaffCertificate> {
    await this.ensureStaff(staffId);
    return this.certificates.save(
      this.certificates.create({
        staffMemberId: staffId,
        name: dto.name.trim(),
        expiresAt: dto.expiresAt ?? null,
      }),
    );
  }

  async updateCertificate(
    staffId: string,
    certId: string,
    dto: UpdateStaffCertificateDto,
  ): Promise<StaffCertificate> {
    const certificate = await this.getCertificate(staffId, certId);
    if (dto.name !== undefined) certificate.name = dto.name.trim();
    if (dto.expiresAt !== undefined) certificate.expiresAt = dto.expiresAt ?? null;
    return this.certificates.save(certificate);
  }

  async removeCertificate(staffId: string, certId: string): Promise<void> {
    const certificate = await this.getCertificate(staffId, certId);
    await this.certificates.softRemove(certificate);
  }

  // ─── Yutuqlar ──────────────────────────────────────────────────────────────

  async listAchievements(staffId: string): Promise<StaffAchievement[]> {
    await this.ensureStaff(staffId);
    return this.achievements.find({
      where: { staffMemberId: staffId },
      order: { achievedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async createAchievement(staffId: string, dto: CreateStaffAchievementDto): Promise<StaffAchievement> {
    await this.ensureStaff(staffId);
    return this.achievements.save(
      this.achievements.create({
        staffMemberId: staffId,
        title: dto.title.trim(),
        category: dto.category,
        rank: dto.rank,
        icon: dto.icon,
        achievedAt: dto.achievedAt ?? null,
        organization: dto.organization?.trim() ?? null,
        description: dto.description?.trim() ?? null,
        certificateUrl: dto.certificateUrl?.trim() ?? null,
      }),
    );
  }

  async updateAchievement(
    staffId: string,
    achId: string,
    dto: UpdateStaffAchievementDto,
  ): Promise<StaffAchievement> {
    const achievement = await this.getAchievement(staffId, achId);
    if (dto.title !== undefined) achievement.title = dto.title.trim();
    if (dto.category !== undefined) achievement.category = dto.category;
    if (dto.rank !== undefined) achievement.rank = dto.rank;
    if (dto.icon !== undefined) achievement.icon = dto.icon;
    if (dto.achievedAt !== undefined) achievement.achievedAt = dto.achievedAt ?? null;
    if (dto.organization !== undefined) achievement.organization = dto.organization?.trim() ?? null;
    if (dto.description !== undefined) achievement.description = dto.description?.trim() ?? null;
    if (dto.certificateUrl !== undefined) achievement.certificateUrl = dto.certificateUrl?.trim() ?? null;
    return this.achievements.save(achievement);
  }

  async removeAchievement(staffId: string, achId: string): Promise<void> {
    const achievement = await this.getAchievement(staffId, achId);
    await this.achievements.softRemove(achievement);
  }

  // ─── Helperlar ─────────────────────────────────────────────────────────────

  private async ensureStaff(staffId: string): Promise<void> {
    const exists = await this.staff.findOne({ where: tenantWhere<StaffMember>(this.tenant, { id: staffId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Xodim topilmadi');
  }

  private async getCertificate(staffId: string, certId: string): Promise<StaffCertificate> {
    const certificate = await this.certificates.findOne({
      where: { id: certId, staffMemberId: staffId },
    });
    if (!certificate) throw new NotFoundException('Sertifikat topilmadi');
    return certificate;
  }

  private async getAchievement(staffId: string, achId: string): Promise<StaffAchievement> {
    const achievement = await this.achievements.findOne({
      where: { id: achId, staffMemberId: staffId },
    });
    if (!achievement) throw new NotFoundException('Yutuq topilmadi');
    return achievement;
  }
}
