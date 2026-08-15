import { CommonStatus } from '../src/common/enums/common-status.enum';
import { validateDto } from '../src/common/validation/validate-dto';
import { CreateUserDto } from '../src/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../src/modules/users/dto/update-user.dto';
import { UserQueryDto } from '../src/modules/users/dto/user-query.dto';

describe('CreateUserDto', () => {
  it('accepts the full user creation form payload', async () => {
    const errors = await validateDto(CreateUserDto, {
      username: 'javohir.aliyev',
      password: 'Str0ng-passphrase!',
      email: 'javohir@example.uz',
      profileImageUrl: 'https://cdn.example.uz/users/javohir.png',
      firstName: 'Javohir',
      firstNameCyrillic: 'Жавоҳир',
      lastName: 'Aliyev',
      lastNameCyrillic: 'Алиев',
      middleName: 'Valiyevich',
      middleNameCyrillic: 'Валиевич',
      birthDate: '2000-01-15',
      documentNumber: 'AB1234567',
      gender: 'male',
      phone: '+998901234567',
      role: 'TEACHER',
      pinfl: '12345678901234',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid user form fields and unknown properties', async () => {
    const errors = await validateDto(CreateUserDto, {
      username: 'no',
      password: '123',
      email: 'wrong-email',
      profileImageUrl: 'not-url',
      firstName: '',
      firstNameCyrillic: '',
      lastName: '',
      lastNameCyrillic: '',
      birthDate: '15-01-2000',
      documentNumber: '!bad',
      gender: 'other',
      phone: '90123',
      role: 'OWNER',
      pinfl: '123',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('username');
    expect(serialized).toContain('password');
    expect(serialized).toContain('email');
    expect(serialized).toContain('profileImageUrl');
    expect(serialized).toContain('firstName');
    expect(serialized).toContain('firstNameCyrillic');
    expect(serialized).toContain('lastName');
    expect(serialized).toContain('lastNameCyrillic');
    expect(serialized).toContain('birthDate');
    expect(serialized).toContain('documentNumber');
    expect(serialized).toContain('gender');
    expect(serialized).toContain('phone');
    expect(serialized).toContain('role');
    expect(serialized).toContain('pinfl');
    expect(serialized).toContain('extra');
  });
});

describe('UpdateUserDto', () => {
  it('accepts partial user update payload', async () => {
    const errors = await validateDto(UpdateUserDto, {
      phone: '+998991112233',
      status: CommonStatus.ACTIVE,
    });

    expect(errors).toHaveLength(0);
  });

  // T-02: rol va parol profil tahriridan chiqarilgan — `users.update` ruxsati
  // bilan imtiyoz oshirib bo'lmasin. Whitelist ularni noma'lum maydon deb
  // 400 bilan rad etishi shart (jim e'tiborsiz qoldirish emas).
  it('rejects role, roleNames and password as unknown fields', async () => {
    const errors = await validateDto(UpdateUserDto, {
      role: 'SUPERMANAGER',
      roleNames: ['director'],
      password: 'New-strong-passphrase!',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('role');
    expect(serialized).toContain('roleNames');
    expect(serialized).toContain('password');
  });
});

describe('UserQueryDto', () => {
  it('accepts filters used by the user management page', async () => {
    const errors = await validateDto(UserQueryDto, {
      search: 'javohir',
      role: 'TEACHER',
      gender: 'male',
      status: CommonStatus.ACTIVE,
      page: 1,
      limit: 20,
    });

    expect(errors).toHaveLength(0);
  });
});
