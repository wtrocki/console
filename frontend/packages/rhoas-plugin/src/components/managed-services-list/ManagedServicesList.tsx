import * as React from 'react';
import { Gallery, GalleryItem } from '@patternfly/react-core';
import { CatalogTile } from '@patternfly/react-catalog-view-extension';
import { history } from '@console/internal/components/utils';
import { PageLayout } from '@console/shared';
import AccessManagedServices from '../access-managed-services/AccessManagedServices';
import { AccessTokenSecretName, temporaryIcon } from '../../const';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { SecretModel } from '@console/internal/models';
import { useActiveNamespace } from '@console/shared';
import { LockIcon } from '@patternfly/react-icons';
import './ManagedServicesList.css';
import NamespacedPage, {
  NamespacedPageVariants,
} from '@console/dev-console/src/components/NamespacedPage';

const ManagedServicesList = () => {
  const [currentNamespace] = useActiveNamespace();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  console.log("Token page rendered for namespace ", currentNamespace, AccessTokenSecretName)
  const [tokenSecret] = useK8sWatchResource({ kind: SecretModel.kind, isList: false, name: AccessTokenSecretName, namespace: currentNamespace, namespaced: true })


  const checkTokenSecretStatus = () => {
    if (tokenSecret) {
      history.push("/managedServices/managedkafka");
    }
    else {
      setIsModalOpen(true);
    }
  }

  const tokenStatusFooter = () => {
    if (tokenSecret) {
      return (
        <span>Unlocked</span>
      )
    }
    else {
      return (
        <div className="temp-token-status-footer">
          <LockIcon />
          <span>Unlock with token</span>
        </div>
      )
    }
  }

  const defaultHintBlockText = `Select Managed Service you would like to connect with. To use the Red Hat Managed Services you need to have account and at least one active service in https://cloud.redhat.com`;

  return (
    <>
      <NamespacedPage variant={NamespacedPageVariants.light} hideApplications>
        <PageLayout title={"Select Managed Service"} hint={defaultHintBlockText} isDark>
          <Gallery className="co-catalog-tile-view" hasGutter>
            <GalleryItem>
              <CatalogTile
                data-test-id={"kafka-id"}
                className="co-kafka-tile"
                onClick={() => checkTokenSecretStatus()}
                title="Red Hat OpenShift Application Services"
                iconImg={temporaryIcon}
                iconClass={""}
                icon={""}
                description={"RHOAS can include Managed Kafka, Service Registry, custom resources for Managed Kafka, and Open Data Hub"}
                footer={tokenStatusFooter()}
              />
            </GalleryItem>
          </Gallery>
          <AccessManagedServices
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
          />
        </PageLayout>
      </NamespacedPage>
    </>
  );
};

export default ManagedServicesList;
