import {
    Column,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
  } from "typeorm";
  import { RefreshTokens } from "../../refresh_tokens/entities/refresh_token.entity";
  import { Members } from "../../members/entities/member.entity";
  
  @Index("IDX_f47837bea3ea1fb53f44c96ea0", ["email"], { unique: true })
  @Entity("gyms", { schema: "test" })
  export class Gyms {
    @PrimaryGeneratedColumn({ type: "int", name: "id" })
    id: number;
  
    @Column("varchar", { name: "email", unique: true, length: 100 })
    email: string;
  
    @Column("varchar", { name: "password", length: 255 })
    password: string;
  
    @Column("varchar", { name: "gym_name", length: 100 })
    gymName: string;
  
    @Column("varchar", { name: "owner_name", length: 50 })
    ownerName: string;
  
    @Column("datetime", {
      name: "created_at",
      default: () => "'CURRENT_TIMESTAMP(6)'",
    })
    createdAt: Date;
  
    @OneToMany(() => RefreshTokens, (refreshTokens) => refreshTokens.gym)
    refreshTokens: RefreshTokens[];
  
    @OneToMany(() => Members, (members) => members.gym)
    members: Members[];
  }
  