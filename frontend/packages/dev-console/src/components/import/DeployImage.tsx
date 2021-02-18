import * as React from 'react';
import { Formik, FormikHelpers } from 'formik';
import { connect } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ALL_APPLICATIONS_KEY, usePostFormSubmitAction } from '@console/shared';
import { history } from '@console/internal/components/utils';
import { getActiveApplication } from '@console/internal/reducers/ui';
import { RootState } from '@console/internal/redux';
import { K8sResourceKind } from '@console/internal/module/k8s';
import { sanitizeApplicationValue } from '@console/topology/src/utils/application-utils';
import { DeployImageFormData, FirehoseList, Resources } from './import-types';
import { createOrUpdateDeployImageResources } from './deployImage-submit-utils';
import { deployValidationSchema } from './deployImage-validation-utils';
import DeployImageForm from './DeployImageForm';
import { healthChecksProbeInitialData } from '../health-checks/health-checks-probe-utils';

export interface DeployImageProps {
  namespace: string;
  projects?: FirehoseList;
  contextualSource?: string;
}

interface StateProps {
  activeApplication: string;
}

type Props = DeployImageProps & StateProps;

const DeployImage: React.FC<Props> = ({
  namespace,
  projects,
  activeApplication,
  contextualSource,
}) => {
  const postFormCallback = usePostFormSubmitAction();
  const { t } = useTranslation();
  const initialValues: DeployImageFormData = {
    project: {
      name: namespace || '',
      displayName: '',
      description: '',
    },
    application: {
      initial: sanitizeApplicationValue(activeApplication),
      name: sanitizeApplicationValue(activeApplication),
      selectedKey: activeApplication,
      isInContext: !!sanitizeApplicationValue(activeApplication),
    },
    name: '',
    searchTerm: '',
    registry: 'external',
    allowInsecureRegistry: false,
    imageStream: {
      image: '',
      tag: '',
      namespace: namespace || '',
    },
    isi: {
      name: '',
      image: {},
      tag: '',
      status: { metadata: {}, status: '' },
      ports: [],
    },
    image: {
      name: '',
      image: {},
      tag: '',
      status: { metadata: {}, status: '' },
      ports: [],
    },
    runtimeIcon: null,
    isSearchingForImage: false,
    serverless: {
      scaling: {
        minpods: 0,
        maxpods: '',
        concurrencytarget: '',
        concurrencylimit: '',
      },
    },
    route: {
      disable: false,
      create: true,
      targetPort: '',
      unknownTargetPort: '',
      defaultUnknownPort: 8080,
      path: '',
      hostname: '',
      secure: false,
      tls: {
        termination: '',
        insecureEdgeTerminationPolicy: '',
        caCertificate: '',
        certificate: '',
        destinationCACertificate: '',
        privateKey: '',
      },
    },
    resources: Resources.Kubernetes,
    resourceTypesNotValid: contextualSource ? [Resources.KnativeService] : [],
    build: {
      env: [],
      triggers: {
        webhook: true,
        image: true,
        config: true,
      },
      strategy: 'Source',
    },
    deployment: {
      env: [],
      triggers: {
        image: true,
        config: true,
      },
      replicas: 1,
    },
    labels: {},
    env: {},
    limits: {
      cpu: {
        request: '',
        requestUnit: 'm',
        defaultRequestUnit: 'm',
        limit: '',
        limitUnit: 'm',
        defaultLimitUnit: 'm',
      },
      memory: {
        request: '',
        requestUnit: 'Mi',
        defaultRequestUnit: 'Mi',
        limit: '',
        limitUnit: 'Mi',
        defaultLimitUnit: 'Mi',
      },
    },
    healthChecks: healthChecksProbeInitialData,
  };

  const handleSubmit = (
    values: DeployImageFormData,
    helpers: FormikHelpers<DeployImageFormData>,
  ) => {
    const {
      project: { name: projectName },
    } = values;

    const resourceActions: Promise<K8sResourceKind[]> = createOrUpdateDeployImageResources(
      values,
      true,
    ).then(() => {
      const requests: Promise<K8sResourceKind[]> = createOrUpdateDeployImageResources(values);
      return requests;
    });
    resourceActions.then((resources) => postFormCallback(resources)).catch(() => {});

    return resourceActions
      .then(() => {
        history.push(`/topology/ns/${projectName}`);
      })
      .catch((err) => {
        helpers.setStatus({ submitError: err.message });
      });
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onReset={history.goBack}
      validationSchema={deployValidationSchema(t)}
    >
      {(formikProps) => <DeployImageForm {...formikProps} projects={projects} />}
    </Formik>
  );
};

interface OwnProps extends DeployImageProps {
  forApplication?: string;
}
const mapStateToProps = (state: RootState, ownProps: OwnProps): StateProps => {
  const activeApplication = ownProps.forApplication || getActiveApplication(state);

  return {
    activeApplication: activeApplication !== ALL_APPLICATIONS_KEY ? activeApplication : '',
  };
};

export default connect(mapStateToProps)(DeployImage);
