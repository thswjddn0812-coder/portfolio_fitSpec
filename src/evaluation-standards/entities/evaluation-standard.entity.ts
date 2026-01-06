import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TestCategories } from "../../test_categories/entities/test_category.entity";

@Entity("evaluation_standards", { schema: "test" })
export class EvaluationStandards {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("enum", { name: "gender", enum: ["M", "F"] })
  gender: "M" | "F";

  @Column("int", { name: "body_weight", nullable: true })
  bodyWeight: number | null;

  @Column("decimal", {
    name: "beginner",
    nullable: true,
    precision: 5,
    scale: 2,
  })
  beginner: string | null;

  @Column("decimal", { name: "novice", nullable: true, precision: 5, scale: 2 })
  novice: string | null;

  @Column("decimal", {
    name: "intermediate",
    nullable: true,
    precision: 5,
    scale: 2,
  })
  intermediate: string | null;

  @Column("decimal", {
    name: "advanced",
    nullable: true,
    precision: 5,
    scale: 2,
  })
  advanced: string | null;

  @Column("decimal", { name: "elite", nullable: true, precision: 5, scale: 2 })
  elite: string | null;

  @ManyToOne(
    () => TestCategories,
    (testCategories) => testCategories.evaluationStandards,
    { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
  )
  @JoinColumn([{ name: "category_id", referencedColumnName: "id" }])
  category: TestCategories;
}
