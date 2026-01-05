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
  
    @Column("int", { name: "min_age" })
    minAge: number;
  
    @Column("int", { name: "max_age" })
    maxAge: number;
  
    @Column("varchar", { name: "grade", length: 10 })
    grade: string;
  
    @Column("decimal", { name: "min_value", precision: 10, scale: 2 })
    minValue: string;
  
    @ManyToOne(
      () => TestCategories,
      (testCategories) => testCategories.evaluationStandards,
      { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
    )
    @JoinColumn([{ name: "category_id", referencedColumnName: "id" }])
    category: TestCategories;
  }
  