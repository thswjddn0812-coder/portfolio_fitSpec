import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TestCategories } from "../../test_categories/entities/test_category.entity";

@Index("fk_age_coefficients_category", ["categoryId"], {})
@Entity("age_coefficients", { schema: "test" })
export class AgeCoefficients {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("enum", { name: "gender", enum: ["M", "F"] })
  gender: "M" | "F";

  @Column("int", { name: "age" })
  age: number;

  @Column("decimal", { name: "coefficient", precision: 4, scale: 3 })
  coefficient: string;

  @Column("int", { name: "category_id", nullable: true })
  categoryId: number | null;

  @ManyToOne(
    () => TestCategories,
    (testCategories) => testCategories.ageCoefficients,
    { onDelete: "NO ACTION", onUpdate: "NO ACTION", nullable: true, createForeignKeyConstraints: false }
  )
  @JoinColumn([{ name: "category_id", referencedColumnName: "id" }])
  category: TestCategories | null;
}
