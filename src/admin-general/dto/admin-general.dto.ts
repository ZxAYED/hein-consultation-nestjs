import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

const toBoolean = ({ value }: { value: any }) => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

export class UpdateAdminGeneralSettingsDto {
  @IsOptional()
  @IsString()
  platformName?: string;

  @IsOptional()
  @IsString()
  slogan?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class ToggleSettingsDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isBlogModuleEnabled?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isServiceModuleEnabled?: boolean;
}
