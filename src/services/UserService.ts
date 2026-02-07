import { FEATURE_FLAGS } from "../config/featureFlags";
import { AppError, ID, nowIso, generateId } from "../models/common";
import { CreateUserInput, User, UserRole } from "../models/user";
import { createLogger } from "../utils/logger";
import { ensureArrayNotEmpty, requireNonEmptyString, validateEmail } from "../utils/validators";
import { NotificationService } from "./NotificationService";

export class UserService {
  private logger = createLogger("UserService");
  private users = new Map<ID, User>();

  constructor(private notificationService: NotificationService) {
    this.seed();
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const email = validateEmail(requireNonEmptyString(input.email, "email"));
    const name = requireNonEmptyString(input.name, "name");

    const user: User = {
      id: generateId("user"),
      email,
      name,
      phone: input.phone,
      role: input.role ?? UserRole.CUSTOMER,
      addresses: input.addresses ?? [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    this.users.set(user.id, user);
    this.logger.info("User created", { userId: user.id });

    if (FEATURE_FLAGS.enableWelcomeEmail) {
      await this.notificationService.send("welcome", user.email, { name: user.name });
    }

    return user;
  }

  async getUserById(userId: ID): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AppError({
        code: "USER_NOT_FOUND",
        message: "User not found",
        status: 404,
        details: { userId }
      });
    }
    return user;
  }

  async updateLastLogin(userId: ID): Promise<void> {
    const user = await this.getUserById(userId);
    user.lastLoginAt = nowIso();
    user.updatedAt = nowIso();
    this.users.set(user.id, user);
  }

  async requirePrimaryAddress(userId: ID): Promise<string> {
    const user = await this.getUserById(userId);
    const addresses = ensureArrayNotEmpty(user.addresses, "addresses");
    const primary = addresses[0];
    return `${primary.street}, ${primary.number} - ${primary.city}`;
  }

  private seed(): void {
    const user: User = {
      id: "user_001",
      email: "ana.silva@example.com",
      name: "Ana Silva",
      role: UserRole.CUSTOMER,
      addresses: [
        {
          street: "Rua das Flores",
          number: "120",
          district: "Centro",
          city: "Curitiba",
          state: "PR",
          postalCode: "80000-000",
          country: "BR"
        }
      ],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    this.users.set(user.id, user);
  }
}
