import { NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { CounselingService } from "../src/modules/counseling/counseling.service";
import type { CounselingSession } from "../src/modules/counseling/entities/counseling-session.entity";
import type { EncryptionService } from "../src/common/security/encryption.service";
import type { Student } from "../src/modules/students/entities/student.entity";
import type { User } from "../src/modules/identity/entities/user.entity";
import type { TenantContextService } from "../src/common/tenant/tenant-context.service";

/** Reversible stand-in for AES-GCM — xuddi shu naqsh integrations.service.spec.ts da. */
const fakeEncryption = {
  encrypt: (plaintext: string): string =>
    `v1.iv.tag.${Buffer.from(plaintext, "utf8").toString("base64")}`,
  decrypt: (payload: string): string =>
    Buffer.from(payload.split(".")[3], "base64").toString("utf8"),
};

describe("CounselingService", () => {
  let sessions: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let students: { find: jest.Mock };
  let users: { find: jest.Mock };
  let service: CounselingService;

  const tenant = { getSchoolId: () => null, getBranchId: () => null } as unknown as TenantContextService;

  const row = {
    id: "sess-1",
    studentId: "stu-1",
    counselorId: "psy-1",
    sessionDate: "2026-09-01T09:00:00.000Z",
    sessionType: "individual",
    notesEncrypted: fakeEncryption.encrypt("Maxfiy izoh matni"),
    riskLevel: "medium",
    followUpDate: null,
    createdAt: new Date(),
  } as unknown as CounselingSession;

  beforeEach(() => {
    sessions = {
      find: jest.fn().mockResolvedValue([row]),
      findOne: jest.fn().mockResolvedValue(row),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ ...row, ...v })),
    };
    students = { find: jest.fn().mockResolvedValue([{ id: "stu-1", firstName: "Vali", lastName: "Aliyev" }]) };
    users = { find: jest.fn().mockResolvedValue([{ id: "psy-1", firstName: "Dilnoza", lastName: "Karimova" }]) };
    service = new CounselingService(
      sessions as unknown as Repository<CounselingSession>,
      students as unknown as Repository<Student>,
      users as unknown as Repository<User>,
      fakeEncryption as unknown as EncryptionService,
      tenant,
    );
  });

  it("findAll — ismlarni bitta partiyada (batch) hal qiladi, N+1 emas", async () => {
    const result = await service.findAll();

    expect(result).toEqual([
      expect.objectContaining({
        id: "sess-1",
        studentName: "Aliyev Vali",
        counselorName: "Karimova Dilnoza",
      }),
    ]);
    // Ro'yxatda nechta yozuv bo'lishidan qat'iy nazar — talab/psixolog jadvaliga
    // BIR martagina murojaat (N+1 emas).
    expect(students.find).toHaveBeenCalledTimes(1);
    expect(users.find).toHaveBeenCalledTimes(1);
  });

  it("findAll — hech qanday izoh (notes) qaytarmaydi, faqat metama'lumot", async () => {
    const [summary] = await service.findAll();
    expect(summary).not.toHaveProperty("notes");
  });

  it("findByStudent — bitta o'quvchi bo'yicha filtrlaydi", async () => {
    await service.findByStudent("stu-1");
    expect(sessions.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ studentId: "stu-1" }) }),
    );
  });

  it("findOne — izohni deshifrlab, ism bilan birga qaytaradi", async () => {
    const detail = await service.findOne("sess-1");
    expect(detail.notes).toBe("Maxfiy izoh matni");
    expect(detail.studentName).toBe("Aliyev Vali");
    expect(detail.counselorName).toBe("Karimova Dilnoza");
  });

  it("findOne — topilmasa NotFound", async () => {
    sessions.findOne.mockResolvedValue(null);
    await expect(service.findOne("yo-q")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("create — izohni shifrlab saqlaydi, javobda ochiq matn + ismlar qaytadi", async () => {
    const result = await service.create({
      studentId: "stu-1",
      counselorId: "psy-1",
      sessionDate: "2026-09-01T09:00:00.000Z",
      sessionType: "individual",
      notes: "Yangi seans yozuvi",
    });

    const saved = sessions.save.mock.calls[0][0] as CounselingSession;
    expect(saved.notesEncrypted).not.toContain("Yangi seans yozuvi"); // shifrlangan
    expect(fakeEncryption.decrypt(saved.notesEncrypted)).toBe("Yangi seans yozuvi");
    expect(result.notes).toBe("Yangi seans yozuvi");
    expect(result.studentName).toBe("Aliyev Vali");
  });

  it("update — faqat berilgan maydonlarni o'zgartiradi", async () => {
    const result = await service.update("sess-1", { riskLevel: "high" });
    expect(sessions.save).toHaveBeenCalled();
    expect(result.studentName).toBe("Aliyev Vali");
  });

  it("update — topilmasa NotFound", async () => {
    sessions.findOne.mockResolvedValue(null);
    await expect(service.update("yo-q", { riskLevel: "low" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("ism topilmasa null qaytaradi (o'chirilgan/topilmagan foydalanuvchi)", async () => {
    students.find.mockResolvedValue([]);
    const [summary] = await service.findAll();
    expect(summary.studentName).toBeNull();
  });
});
