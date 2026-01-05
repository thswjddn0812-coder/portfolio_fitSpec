import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PublicPhysicalRecords } from "../../public_physical_records/entities/public_physical_record.entity";
import { EvaluationStandards } from "../../evaluation-standards/entities/evaluation-standard.entity";
import { PhysicalRecords } from "../../physical_records/entities/physical_record.entity";

@Entity("test_categories", { schema: "test" })
export class TestCategories {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("varchar", { name: "name", length: 100 })
  name: string;

  @Column("varchar", { name: "unit", length: 20 })
  unit: string;

  @OneToMany(
    () => PublicPhysicalRecords,
    (publicPhysicalRecords) => publicPhysicalRecords.category
  )
  publicPhysicalRecords: PublicPhysicalRecords[];

  @OneToMany(
    () => EvaluationStandards,
    (evaluationStandards) => evaluationStandards.category
  )
  evaluationStandards: EvaluationStandards[];

  @OneToMany(
    () => PhysicalRecords,
    (physicalRecords) => physicalRecords.category
  )
  physicalRecords: PhysicalRecords[];
}
