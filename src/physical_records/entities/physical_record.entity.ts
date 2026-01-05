import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from "typeorm";
  import { Members } from "../../members/entities/member.entity";
  import { TestCategories } from "../../test_categories/entities/test_category.entity";
  
  @Entity("physical_records", { schema: "test" })
  export class PhysicalRecords {
    @PrimaryGeneratedColumn({ type: "int", name: "id" })
    id: number;
  
    @Column("decimal", { name: "value", precision: 10, scale: 2 })
    value: string;
  
    @Column("date", { name: "measured_at" })
    measuredAt: string;
  
    @ManyToOne(() => Members, (members) => members.physicalRecords, {
      onDelete: "CASCADE",
      onUpdate: "NO ACTION",
    })
    @JoinColumn([{ name: "member_id", referencedColumnName: "id" }])
    member: Members;
  
    @ManyToOne(
      () => TestCategories,
      (testCategories) => testCategories.physicalRecords,
      { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
    )
    @JoinColumn([{ name: "category_id", referencedColumnName: "id" }])
    category: TestCategories;
  }
  