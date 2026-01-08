import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PhysicalRecords } from "../../physical_records/entities/physical_record.entity";
import { PublicPhysicalRecords } from "../../public_physical_records/entities/public_physical_record.entity";
import { EvaluationStandards } from "../../evaluation-standards/entities/evaluation-standard.entity";
import { AgeCoefficients } from "../../age-coefficients/entities/age-coefficient.entity";

@Entity("test_categories", { schema: "test" })
export class TestCategories {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("varchar", { name: "name", length: 100 })
  name: string;

  @Column("varchar", { name: "unit", length: 20 })
  unit: string;

  @OneToMany(
    () => PhysicalRecords,
    (physicalRecords) => physicalRecords.category
  )
  physicalRecords: PhysicalRecords[];

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
    () => AgeCoefficients,
    (ageCoefficients) => ageCoefficients.category
  )
  ageCoefficients: AgeCoefficients[];
}
