import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";

const Maintenance = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            <Construction className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {t('maintenance.title', 'Site em Manutenção')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('maintenance.message', 'Estamos realizando melhorias no Tree. Voltaremos em breve!')}
          </p>
        </div>

        <div className="pt-6 text-sm text-muted-foreground">
          {t('maintenance.footer', 'Obrigado pela compreensão.')}
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
