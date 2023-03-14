import { plainToInstance } from 'class-transformer';
import { IsString, validateSync } from 'class-validator';

class EnvVariables {
  @IsString()
  PORT: string;

  @IsString()
  PLAY2_DISCORD_TOKEN: string;

  @IsString()
  REDIS_HOST: string;
}

export function EnvValidator(configs: Record<string, unknown>) {
  const validateConfig = plainToInstance(EnvVariables, configs, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validateConfig);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return validateConfig;
}
