import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from "typeorm";
  import { Gyms } from "../../gyms/entities/gym.entity";
  
  @Entity("refresh_tokens", { schema: "test" })
  export class RefreshTokens {
    @PrimaryGeneratedColumn({ type: "int", name: "id" })
    id: number;
  
    @Column("varchar", { name: "token_hash", length: 255 })
    tokenHash: string;
  
    @Column("timestamp", { name: "expires_at" })
    expiresAt: Date;
  
    @Column("tinyint", { name: "is_revoked", default: () => "'0'" })
    isRevoked: number;
  
    @Column("datetime", {
      name: "created_at",
      default: () => "'CURRENT_TIMESTAMP(6)'",
    })
    createdAt: Date;
  
    @ManyToOne(() => Gyms, (gyms) => gyms.refreshTokens, {
      onDelete: "CASCADE",
      onUpdate: "NO ACTION",
    })
    @JoinColumn([{ name: "gym_id", referencedColumnName: "id" }])
    gym: Gyms;
  }
  