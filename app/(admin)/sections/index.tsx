import { useSections, useDeleteSection } from '@/hooks/useSections';
import { getCurrentLocale } from '@/i18n';
import { getSectionName } from '@/types/models';
import { TaxonomyListScreen } from '@/components/admin/TaxonomyListScreen';

export default function AdminSectionsScreen() {
  const locale = getCurrentLocale();
  const { data: sections, isLoading } = useSections(false);
  const deleteMutation = useDeleteSection();

  return (
    <TaxonomyListScreen
      title="إدارة الأقسام"
      noun="القسم"
      icon="file-tray-stacked-outline"
      items={sections}
      isLoading={isLoading}
      productKey="section_id"
      getName={(s) => getSectionName(s, locale)}
      editPath={(id) => `/(admin)/sections/${id}`}
      addPath="/(admin)/sections/add"
      onDelete={(id) => deleteMutation.mutate(id)}
    />
  );
}
