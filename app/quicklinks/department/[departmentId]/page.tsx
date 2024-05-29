import { DepartmentLinks } from "@/components/screens/Quicklinks/screens/Department/DepartmentQuicklinks";

const Departments = ({ params }: { params: { departmentId: string } }) => {
  const departmentSlug = params.departmentId;
  return <DepartmentLinks departmentSlug={departmentSlug} />;
};

export default Departments;
