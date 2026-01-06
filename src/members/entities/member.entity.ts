import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
  } from "typeorm";
  import { PhysicalRecords } from "../../physical_records/entities/physical_record.entity";
  import { Gyms } from "../../gyms/entities/gym.entity";
  
  @Entity("members", { schema: "test" })
  export class Members {
    @PrimaryGeneratedColumn({ type: "int", name: "id" })
    id: number;
  
    @Column("varchar", { name: "name", length: 50 })
    name: string;
  
    @Column("enum", { name: "gender", enum: ["M", "F"] })
    gender: "M" | "F";

    @Column("int", { name: "age" })
    age: number;

    @Column("decimal", { name: "height", precision: 5, scale: 2 })
    height: string;
  
    @Column("decimal", { name: "weight", precision: 5, scale: 2 })
    weight: string;
  
    @Column("text", { name: "notes", nullable: true })
    notes: string | null;
  
    @Column("datetime", {
      name: "created_at",
      default: () => "'CURRENT_TIMESTAMP(6)'",
    })
    createdAt: Date;
  
    @OneToMany(() => PhysicalRecords, (physicalRecords) => physicalRecords.member)
    physicalRecords: PhysicalRecords[];
  
    @ManyToOne(() => Gyms, (gyms) => gyms.members, {
      onDelete: "CASCADE",
      onUpdate: "NO ACTION",
    })
    @JoinColumn([{ name: "gym_id", referencedColumnName: "id" }])
    gym: Gyms;
  }
  