import { useTranslation } from 'react-i18next';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { getCurrentLocale } from '@/i18n';
import { getCategoryName } from '@/types/models';
import { TaxonomyListScreen } from '@/components/admin/TaxonomyListScreen';

export default function AdminCategoriesScreen() {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const { data: categories, isLoading } = useCategories(false);
  const deleteMutation = useDeleteCategory();

  return (
    <TaxonomyListScreen
      title={t('admin.manageCategories')}
      noun="الفئة"
      icon="grid-outline"
      items={categories}
      isLoading={isLoading}
      productKey="category_id"
      getName={(c) => getCategoryName(c, locale)}
      editPath={(id) => `/(admin)/categories/${id}`}
      addPath="/(admin)/categories/add"
      onDelete={(id) => deleteMutation.mutate(id)}
      blockDeleteWhenUsed
    />
  );
}
