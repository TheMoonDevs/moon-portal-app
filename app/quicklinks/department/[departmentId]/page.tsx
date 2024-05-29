import { DepartmentLinks } from "@/components/screens/Quicklinks/screens/DepartmentQuicklinks/DepartmentQuicklinks";

const Departments = ({ params }: { params: { departmentId: string } }) => {
  const departmentSlug = params.departmentId;
  return <DepartmentLinks departmentSlug={departmentSlug} />;
};

export default Departments;
