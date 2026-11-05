import { mountStudio } from './studio';
import { studies } from '#xuui-studies';

const studio = mountStudio(document.getElementById('root')!, studies);
if (import.meta.hot) {
  import.meta.hot.accept('#xuui-studies', (updated) => {
    if (updated) studio.update(updated.studies);
  });
  import.meta.hot.dispose(() => studio.unmount());
}
