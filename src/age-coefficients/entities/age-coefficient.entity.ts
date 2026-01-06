import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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
}
