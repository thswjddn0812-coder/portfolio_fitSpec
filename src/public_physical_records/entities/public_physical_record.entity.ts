import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from "typeorm";
  import { TestCategories } from "../../test_categories/entities/test_category.entity";
  
  @Entity("public_physical_records", { schema: "test" })
  export class PublicPhysicalRecords {
    @PrimaryGeneratedColumn({ type: "int", name: "id" })
    id: number;
  
    @Column("enum", { name: "gender", enum: ["M", "F"] })
    gender: "M" | "F";
  
    @Column("int", { name: "age" })
    age: number;
  
    @Column("decimal", { name: "measured_value", precision: 10, scale: 2 })
    measuredValue: string;
  
    @ManyToOne(
      () => TestCategories,
      (testCategories) => testCategories.publicPhysicalRecords,
      { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
    )
    @JoinColumn([{ name: "category_id", referencedColumnName: "id" }])
    category: TestCategories;
  }
  